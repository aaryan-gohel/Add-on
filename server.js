import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import WebSocket from "ws";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";

// Home Assistant Supervisor API endpoints
const HA_URL = "http://supervisor/core";
const HA_TOKEN = process.env.SUPERVISOR_TOKEN;

// Read addon options
const optionsPath = "/data/options.json";
let options = {};

try {
  if (fs.existsSync(optionsPath)) {
    options = JSON.parse(fs.readFileSync(optionsPath, "utf8"));
  }
} catch (error) {
  console.error("Failed to read options:", error.message);
}

const {
  firebase_project_id = "",
  firebase_service_account_path = "/config/firebase-service-account.json",
  port = 3000,
  cors_origin = "*"
} = options;

console.log("🔧 Addon Configuration:");
console.log(`   Port: ${port}`);
console.log(`   Firebase Project ID: ${firebase_project_id || "Not set"}`);
console.log(`   Service Account Path: ${firebase_service_account_path}`);

// Initialize Firebase Admin
let db = null;
try {
  if (fs.existsSync(firebase_service_account_path)) {
    const serviceAccount = JSON.parse(fs.readFileSync(firebase_service_account_path, "utf8"));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebase_project_id || serviceAccount.project_id
    });
    
    db = admin.firestore();
    console.log("🔥 Firebase Admin initialized successfully");
    
    // Set up Firestore listener
    setupFirestoreListener();
  } else {
    console.log("⚠️  Firebase service account file not found, Firebase features disabled");
  }
} catch (error) {
  console.log("⚠️  Firebase Admin initialization failed:", error.message);
}

const app = express();
app.use(express.json());
app.use(cors({
  origin: cors_origin,
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: cors_origin,
    methods: ["GET", "POST"],
  },
});

// Firestore listener setup
function setupFirestoreListener() {
  if (!db) return;
  
  db.collection("device").onSnapshot((snapshot) => {
    console.log("📱 Firestore snapshot received");
    
    snapshot.docChanges().forEach((change) => {
      console.log("🔄 Firestore change:", change.type);
      
      if (change.type === "added") {
        console.log("➕ New device:", change.doc.data());
      }
      
      if (change.type === "modified") {
        console.log("✏️  Modified device:", change.doc.data());
        const entity_id = "switch.lamp1"; // You might want to get this from the document
        
        const domain = entity_id.split(".")[0];
        axios.post(
          `${HA_URL}/api/services/${domain}/toggle`,
          { entity_id },
          { headers: { Authorization: `Bearer ${HA_TOKEN}` } }
        ).catch(error => {
          console.error("❌ Failed to toggle device:", error.message);
        });
      }
      
      if (change.type === "removed") {
        console.log("➖ Removed device:", change.doc.data());
      }
    });
  });
  
  console.log("👂 Listening to Firestore changes...");
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Firebase Bridge Addon",
    version: "1.0.0",
    status: "running",
    firebase_enabled: !!db,
    timestamp: new Date().toISOString()
  });
});

// REST API to get all states
app.get("/api/states", async (req, res) => {
  try {
    const response = await axios.get(`${HA_URL}/api/states`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Failed to get states:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// REST API to toggle devices
app.post("/api/toggle", async (req, res) => {
  const { entity_id } = req.body;
  try {
    const domain = entity_id.split(".")[0];
    const response = await axios.post(
      `${HA_URL}/api/services/${domain}/toggle`,
      { entity_id },
      { headers: { Authorization: `Bearer ${HA_TOKEN}` } }
    );
    res.json({ success: true, response: response.data });
  } catch (err) {
    console.error("❌ Failed to toggle device:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// REST API for generic service calls
app.post("/api/service", async (req, res) => {
  const { entity_id, service, data } = req.body;
  try {
    const response = await axios.post(
      `${HA_URL}/api/services/${service}`,
      { entity_id, ...data },
      { headers: { Authorization: `Bearer ${HA_TOKEN}` } }
    );
    res.json({ success: true, response: response.data });
  } catch (err) {
    console.error("❌ Failed to call service:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Function to sync Home Assistant state changes to Firebase
async function syncToFirebase(entity_id, new_state) {
  if (!db) return;
  
  try {
    const deviceId = entity_id.replace("light.", "").replace("_", "-");
    
    if (new_state && new_state.state !== undefined) {
      const isOn = new_state.state === "on";
      
      await db.collection("device").doc(deviceId).update({
        state: isOn,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`🔄 Synced ${entity_id} to Firebase: ${isOn}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync ${entity_id} to Firebase:`, error.message);
  }
}

// WebSocket connection to Home Assistant
const wsUrl = `${HA_URL.replace("http", "ws")}/api/websocket`;
console.log("🔌 Connecting to Home Assistant WebSocket:", wsUrl);

const ws = new WebSocket(wsUrl);

ws.on("open", () => {
  console.log("🔌 Connected to Home Assistant WebSocket");
});

ws.on("message", (msg) => {
  const data = JSON.parse(msg);
  
  if (data.type === "auth_required") {
    ws.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
  } else if (data.type === "auth_ok") {
    console.log("✅ Authenticated with Home Assistant");
    ws.send(
      JSON.stringify({
        id: 1,
        type: "subscribe_events",
        event_type: "state_changed",
      })
    );
  } else if (data.type === "event") {
    const { entity_id, new_state } = data.event.data;
    
    // Emit to Socket.IO clients
    io.emit("state_changed", { entity_id, new_state });
    
    // Sync to Firebase if it's a light device
    if (entity_id && entity_id.startsWith("light.")) {
      syncToFirebase(entity_id, new_state).catch(console.error);
    }
  }
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err.message);
});

ws.on("close", () => {
  console.log("🔌 WebSocket connection closed");
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("👤 Client connected:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("👤 Client disconnected:", socket.id);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Firebase Bridge Addon running on port ${port}`);
  console.log(`🌐 Access from: http://homeassistant.local:${port}`);
});
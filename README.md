# Firebase Bridge Home Assistant Addon

This addon bridges Home Assistant with Firebase, providing REST API endpoints and real-time synchronization between your Home Assistant devices and Firebase Firestore.

## Features

- 🔥 **Firebase Integration**: Sync device states with Firebase Firestore
- 🌐 **REST API**: Control Home Assistant devices via HTTP endpoints
- ⚡ **Real-time Updates**: WebSocket connection for live state changes
- 🔌 **Socket.IO**: Real-time communication with web clients
- 🏠 **Native HA Integration**: Uses Home Assistant Supervisor APIs

## Installation

1. Add this repository to your Home Assistant addon store
2. Install the "Firebase Bridge" addon
3. Configure the addon (see Configuration section)
4. Start the addon

## Configuration

### Required Files

Place your Firebase service account JSON file at:
```
/config/firebase-service-account.json
```

### Addon Options

```yaml
firebase_project_id: "your-project-id"  # Optional if included in service account
firebase_service_account_path: "/config/firebase-service-account.json"
port: 3000
cors_origin: "*"
```

## API Endpoints

### Get All Device States
```http
GET http://homeassistant.local:3000/api/states
```

### Toggle Device
```http
POST http://homeassistant.local:3000/api/toggle
Content-Type: application/json

{
  "entity_id": "light.living_room"
}
```

### Call Service
```http
POST http://homeassistant.local:3000/api/service
Content-Type: application/json

{
  "entity_id": "light.living_room",
  "service": "light/turn_on",
  "data": {
    "brightness": 255,
    "color_name": "red"
  }
}
```

### Health Check
```http
GET http://homeassistant.local:3000/
```

## Firebase Integration

The addon automatically:
- Listens for changes in the `device` collection
- Syncs Home Assistant light states to Firebase
- Triggers device actions based on Firestore changes

### Firestore Structure

```javascript
// Collection: device
// Document ID: light-name (e.g., "living-room")
{
  state: true,  // boolean: on/off
  lastUpdated: timestamp
}
```

## Socket.IO Events

Connect to `http://homeassistant.local:3000` to receive real-time events:

```javascript
const socket = io('http://homeassistant.local:3000');

socket.on('state_changed', (data) => {
  console.log('Device state changed:', data.entity_id, data.new_state);
});
```

## Troubleshooting

1. **Firebase not working**: Check that your service account file exists and has proper permissions
2. **API calls failing**: Ensure the addon has started successfully and check the logs
3. **WebSocket issues**: Verify Home Assistant is accessible and the addon has proper API access

## Logs

View addon logs in Home Assistant:
- Go to Supervisor → Firebase Bridge → Logs

## Support

For issues and feature requests, please check the addon logs and create an issue in the repository.
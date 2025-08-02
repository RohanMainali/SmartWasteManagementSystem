# Network Setup Guide for SafaCycle

This guide will help you configure SafaCycle to work on your local network with Expo.

## Quick Setup

### Step 1: Find Your Computer's IP Address

**On macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```cmd
ipconfig
```

**On Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for an IP address like `192.168.x.x`, `10.x.x.x`, or `172.16.x.x` (these are local network addresses).

### Step 2: Update Network Configuration

1. Open `src/config/network.js`
2. Update the `MANUAL_IP` constant with your computer's IP address:
   ```javascript
   export const MANUAL_IP = '192.168.1.YOUR_IP'; // Replace with your actual IP
   ```

### Step 3: Start the Backend

```bash
cd backend
npm start
```

The server will show you the detected IP address and URLs you can use.

### Step 4: Start the Expo App

```bash
npm start
```

## Automatic IP Detection

The app will automatically try to detect your IP address when using Expo Dev Tools. If this doesn't work, make sure you've updated the `MANUAL_IP` in the network configuration file.

## Troubleshooting

### Cannot Connect to Backend

1. **Check if both devices are on the same WiFi network**
2. **Verify the IP address** - make sure it matches your computer's actual IP
3. **Check firewall settings** - ensure port 5001 is not blocked
4. **Test the connection** - try opening `http://YOUR_IP:5001/health` in your mobile browser

### Expo Cannot Reach Metro Bundler

1. **Update Expo CLI**: `npm install -g @expo/cli`
2. **Clear Expo cache**: `expo r -c`
3. **Restart with tunnel**: `expo start --tunnel` (slower but works across networks)

### Still Having Issues?

1. Try using `expo start --localhost` and testing on an iOS Simulator or Android Emulator
2. Check if your router blocks communication between devices (some public WiFi does this)
3. Try connecting both devices to a mobile hotspot for testing

## Network Configuration Details

The app uses these ports:
- **Backend API**: 5001
- **Expo Dev Server**: 8081
- **WebSocket**: 5001 (same as API)

Make sure these ports are available and not blocked by your firewall.

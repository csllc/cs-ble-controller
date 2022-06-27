// Main process

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
    }
  })

  let webContents = win.webContents;

  webContents.openDevTools();

  webContents.on('did-finish-load', () => {
    console.log("did-finish-load");

    webContents.send('bleSetup');

  });

  win.loadFile('index.html')

  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    console.log("deviceList", deviceList);
    callback(deviceList[0].deviceId);

    // For now, we just grab the first device, but eventually we'll need to implement
    // a device picker
  })

}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {

  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})



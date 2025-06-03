const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;
let splash;

function createWindow() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
  });

  splash.loadFile(path.join(__dirname, "splash.html"));

  mainWindow = new BrowserWindow({
    width: 1270,
    height: 725,
    frame: true,
    center: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "public", "icon.png"),
    title: "Tapflow.",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
    },
    show: false,
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
  } else {
    mainWindow.loadURL("http://localhost:3000");
  }

  function checkReady() {
    mainWindow.webContents
      .executeJavaScript("document.readyState")
      .then((readyState) => {
        if (readyState === "complete") {
          splash.destroy();
          setTimeout(() => {
            mainWindow.show();
            mainWindow.reload();
            mainWindow.focus();
          }, 1000);
        } else {
          setTimeout(checkReady, 1000);
        }
      })
      .catch(() => {
        setTimeout(checkReady, 1000);
      });
  }

  mainWindow.webContents.once("dom-ready", () => {
    checkReady();
  });

  mainWindow.on("closed", () => {
    if (!splash.isDestroyed()) splash.destroy();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

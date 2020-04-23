// Modules to control application life and create native browser window
const {app, Menu, BrowserWindow, dialog} = require('electron');

setupMainMenu = function(app){
    const template = [
        { 
        label: "&File", 
        submenu: [
                {
                    label: "&New GCP File",
                    click: function(){
                        // if (dialog.showMessageBoxSync(mainWindow, { 
                        //     title: "Confirm",
                        //     type: "question",
                        //     buttons: ["No", "Yes"],
                        //     message: "Are you sure you want to start over? Unsaved progress will be lost."
                        // }) == 1){
                            mainWindow.loadURL(`file://${__dirname}/dist/gcp-editor-pro/favicon.ico`)
                            mainWindow.loadURL(`file://${__dirname}/dist/gcp-editor-pro/index.html`)
                        // }
                    }
                },
                {
                    label: "&Quit",
                    click: function(){
                        app.exit(0);
                    }
                }
            ] 
        },
        {
            label: "Debug",
            submenu: [
                {
                    role: 'toggledevtools'
                },
                {
                    role: 'reload'
                },
                {
                    role: 'forceReload'
                }
            ]
        },
        {
            label: "&Help",
            submenu: [
                {
                    label: "&About",
                    click: function(){
                        const package = JSON.parse(require('fs').readFileSync(`${__dirname}/package.json`));
                        dialog.showMessageBoxSync(mainWindow, {
                            title: "About",
                            type: "info",
                            buttons: ["OK"],
                            message: `GCP Editor Pro - ${package.author.url}\n\nVersion ${package.version}`
                        })
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: `${__dirname}/dist/gcp-editor-pro/assets/favicons/android-chrome-512x512.png`,
  })

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/dist/gcp-editor-pro/index.html`)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindow();
    setupMainMenu(app);
    mainWindow.maximize();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

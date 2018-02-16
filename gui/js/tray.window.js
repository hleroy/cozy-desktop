const electron = require('electron')
const {dialog, shell} = electron
const {spawn} = require('child_process')
const autoLaunch = require('./autolaunch')
const DASHBOARD_SCREEN_WIDTH = 330
const DASHBOARD_SCREEN_HEIGHT = 830

const {translate} = require('./i18n')

const log = require('../../core-built/app.js').default.logger({
  component: 'GUI'
})

const WindowManager = require('./window_manager')

module.exports = class TrayWM extends WindowManager {
  constructor (...opts) {
    super(...opts)
    this.create().then(() => this.hide())
  }

  windowOptions () {
    return {
      title: 'TRAY',
      windowPosition: (process.platform === 'win32') ? 'trayBottomCenter' : 'trayCenter',
      frame: false,
      show: false,
      skipTaskbar: true,
      // transparent: true,
      width: DASHBOARD_SCREEN_WIDTH,
      height: DASHBOARD_SCREEN_HEIGHT,
      resizable: false,
      movable: false,
      maximizable: false
    }
  }

  makesAppVisible () {
    return false
  }

  create () {
    let pReady = super.create()
    this.win.on('blur', this.onBlur.bind(this))
    return pReady
  }

  show (trayPos) {
    this.log.debug('show')
    this.placeWithTray(DASHBOARD_SCREEN_WIDTH, DASHBOARD_SCREEN_HEIGHT, trayPos)
    this.win.show()
    return Promise.resolve(this.win)
  }

  placeWithTray (wantedWidth, wantedHeight, trayposition) {
    try {
      const bounds = this.win.getBounds()
      // TODO : be smarter about which display to use ?
      const displayObject = electron.screen.getDisplayMatching(bounds)
      const workArea = displayObject.workArea
      const display = displayObject.bounds
      const actualWidth = Math.min(wantedWidth, Math.floor(0.9 * workArea.width))
      const actualHeight = Math.min(wantedHeight, Math.floor(0.9 * workArea.height))

      const newBounds = {width: actualWidth, height: actualHeight}

      if (process.platform === 'darwin') {
        // on MacOS, try to center the popup below the tray icon
        // later we might add a caret.

        if (!trayposition || !trayposition.x) {
          trayposition = {
            x: workArea.width,
            y: workArea.height
          }
        }

        const centeredOnIcon = trayposition.x + Math.floor(trayposition.width / 2 - actualWidth / 2)
        const fullRight = workArea.width - actualWidth

        // in case where the icon is closer to the left border than half the windows width
        // we put the window against the right border.
        // later the caret will need to be moved from its center position in this case.
        newBounds.x = Math.min(centeredOnIcon, fullRight)
        newBounds.y = workArea.y // at the top

      // all others OS let users define where to put the traybar
      // icons are always on the right or bottom of the bar
      // Let's try to guess where the bar is so we can place the window
      // on window it is not platform-like to center above tray icon
      // TODO contibute this to electron-positioner
      } else if (workArea.width < display.width && workArea.x === 0) {
        // right bar -> place window on bottom right
        newBounds.x = workArea.width - actualWidth
        newBounds.y = workArea.y + workArea.height - actualHeight
      } else if (workArea.width < display.width) {
        // left bar -> place window on bottom left
        newBounds.x = workArea.x
        newBounds.y = workArea.y + workArea.height - actualHeight
      } else if (workArea.y === 0) {
        // bottom bar -> place window on bottom right
        newBounds.x = workArea.width - actualWidth
        newBounds.y = workArea.y + workArea.height - actualHeight
      } else {
        // top bar -> place window on top right
        newBounds.x = workArea.width - actualWidth
        newBounds.y = workArea.y
      }
      this.win.setBounds(newBounds)
    } catch (err) {
      log.error({err, wantedWidth, wantedHeight, trayposition}, 'Fail to placeWithTray')
      this.centerOnScreen(wantedWidth, wantedHeight)
    }
  }

  onBlur () {
    setTimeout(() => {
      if (!this.win.isFocused() && !this.win.isDevToolsFocused()) this.hide()
    }, 400)
  }

  hide () {
    if (this.win) {
      this.log.debug('hide')
      this.win.hide()
    }
  }

  shown () {
    return this.win.isVisible()
  }

  ipcEvents () {
    return {
      'go-to-cozy': () => shell.openExternal(this.desktop.config.cozyUrl),
      'go-to-folder': () => shell.openItem(this.desktop.config.syncPath),
      'auto-launcher': (event, enabled) => autoLaunch.setEnabled(enabled),
      'close-app': () => this.desktop.stopSync().then(() => this.app.quit()),
      'unlink-cozy': this.onUnlink
    }
  }

  onUnlink () {
    if (!this.desktop.config.isValid()) {
      log.error('No client!')
      return
    }
    const options = {
      type: 'question',
      title: translate('Unlink Title'),
      message: translate('Unlink Message'),
      detail: translate('Unlink Detail'),
      buttons: [translate('Unlink Cancel'), translate('Unlink OK')],
      cancelId: 0,
      defaultId: 1
    }
    const response = dialog.showMessageBox(this.win, options)
    if (response === 0) {
      this.send('cancel-unlink')
      return
    }
    this.desktop.stopSync()
      .then(() => this.desktop.removeRemote())
      .then(() => log.info('removed'))
      .then(() => this.doRestart())
      .catch((err) => log.error(err))
  }

  doRestart () {
    setTimeout(() => {
      log.info('Exiting old client...')
      this.app.quit()
    }, 50)
    const args = process.argv.slice(1).filter(a => a !== '--isHidden')
    log.info({args, cmd: process.argv[0]}, 'Starting new client...')
    spawn(process.argv[0], args, { detached: true })
  }
}

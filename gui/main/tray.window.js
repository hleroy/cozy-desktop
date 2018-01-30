const {dialog, shell} = require('electron')
const {spawn} = require('child_process')
const autoLaunch = require('./autolaunch')
const Positioner = require('electron-positioner')
const DASHBOARD_SCREEN_WIDTH = 330
const DASHBOARD_SCREEN_HEIGHT = 800

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
    this.positioner = new Positioner(this.win)
    this.win.on('blur', this.onBlur.bind(this))
    return pReady
  }

  show (trayPos) {
    this.log.debug('show')
    let pos = null

    if (trayPos === undefined || trayPos.x === 0) {
      pos = (process.platform === 'win32') ? 'bottomRight' : 'topRight'
    } else {
      pos = (process.platform === 'win32') ? 'trayBottomCenter' : 'trayCenter'
    }
    // FIXME: electron-positioner may throw `TypeError: Error processing
    // argument at index 0, conversion failure from NaN`. Not sure whether it's
    // a bug in cozy-desktop, electron-positioner or electron.
    // Catch error, log it & show the popover wherever possible thus user should
    // report the issue with useful logs but can still use the app.
    try {
      this.positioner.move(pos, trayPos)
    } catch (err) {
      log.error({err}, `electron-positioner#move(pos=${pos}, trayPos=${trayPos})`)
    }
    this.win.show()

    return Promise.resolve(this.win)
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

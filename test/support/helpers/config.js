import fs from 'fs-extra'
import del from 'del'
import path from 'path'

import Config from '../../../core/config'

import { COZY_URL } from './cozy'

export default {
  createConfig () {
    let parent = process.env.COZY_DESKTOP_DIR || 'tmp'
    this.basePath = path.resolve(`${parent}/test/${+new Date()}`)
    this.syncPath = path.join(this.basePath, 'Cozy Drive')
    fs.ensureDirSync(this.syncPath)
    this.config = new Config(path.join(this.basePath, '.cozy-desktop'))
    this.config.syncPath = this.syncPath
    this.config.cozyUrl = COZY_URL
  },

  registerClient () {
    this.config.config.creds = {
      client: {
        clientID: process.env.COZY_CLIENT_ID || 'desktop',
        clientName: 'desktop',
        softwareID: 'cozy-desktop',
        redirectURI: 'http://localhost/'
      },
      token: {
        accessToken: process.env.COZY_STACK_TOKEN
      }
    }
  },

  cleanConfig () {
    this.timeout && this.timeout(5 * 60 * 1000)
    return del.sync(this.syncPath, {force: process.env.TRAVIS})
  }
}

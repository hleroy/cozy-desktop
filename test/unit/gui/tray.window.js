/* eslint-env mocha */

import should from 'should'

import { popoverBounds } from '../../../gui/js/tray.window'

describe('tray.window', () => {
  describe('popoverBounds', () => {
    const wantedWidth = 330
    const wantedHeight = 830

    it('aligns popover to the top right with missing tray bar and icon positions', () => {
      const trayposition = {x: 0, y: 0, width: 0, height: 0}
      const workArea = {x: 0, y: 0, width: 2560, height: 1440}
      const display = workArea

      should(popoverBounds(wantedWidth, wantedHeight, trayposition, workArea, display)).deepEqual({
        width: wantedWidth,
        height: wantedHeight,
        x: 2230,
        y: 610
      })
    })
  })
})

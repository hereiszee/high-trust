/* a scripted controller: navigator.getGamepads() returns it; __pad.set({axes, buttons}) */
const FAKE_PAD = () => { const mk = () => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
  const pad = mk(); navigator.getGamepads = () => [pad, null, null, null];
  window.__pad = { pad, set(o) { if (o.axes) pad.axes = o.axes.slice(); if (o.buttons) for (const [i, v] of Object.entries(o.buttons)) pad.buttons[i] = { pressed: !!v, touched: !!v, value: v ? 1 : 0 }; pad.timestamp++ } };
  window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })) };

module.exports = { FAKE_PAD };

// ════════════════════════════════════════════════════════════════
//  CENTRAL STATE STORE — shared mutable state via window.S
//  All modules read/write through window.S to avoid ES module
//  binding restrictions on reassignment.
// ════════════════════════════════════════════════════════════════
const S = {
  agentsData: {},
  agentStates: {},
  idleOccupied: {},
  doorAnim: { open: 0, target: 0, timer: 0 },
  globalTick: 0,
  lastTime: 0,
  startTime: Date.now(),
  // Admin state
  adminMode: false,
  simsMode: false,
  simsSelectedAgent: null,
  adminObjects: [],
  adminSelected: null,
  adminDragging: false,
  adminDragOff: { x: 0, y: 0 },
  adminHover: null,
  adminWalls: [],
  adminHoverWall: null,
  adminSelectedWall: null,
  adminDraggingWall: false,
  adminAuthed: false,
  // Printer / trash
  printerActive: 0,
  trashLevel: 0,
  trashAgentId: null,
  // Bowl refill tracking
  bowlRefills: {},
  // Click anims
  clickAnims: [],
  // Canvas/ctx
  canvas: null,
  ctx: null,
};
window.S = S;
export default S;

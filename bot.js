const fs = require('fs')
const path = require('path')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { Vec3 } = require('vec3')

// ─── CONFIG ─────────────────────────────────────────────────────
const HOST = process.env.MC_HOST || '127.0.0.1'
const PORT = Number(process.env.MC_PORT || 25565)
const VERSION = process.env.MC_VERSION || '1.13.2'
const USERNAME = process.env.BOT_USERNAME || 'DumbLearner_113'

const LOG_NAMES = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log']
const PLANK_NAMES = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks']
const PICKAXE_NAMES = ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe']
const HOSTILE_MOBS = ['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'enderman', 'husk', 'drowned']
const PASSIVE_FOOD_MOBS = ['cow', 'pig', 'chicken', 'sheep', 'rabbit']
const WEAPON_NAMES = ['diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword']
const AXE_NAMES = ['diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe']
const FOOD_ITEM_NAMES = [
  'bread', 'apple', 'carrot', 'potato', 'baked_potato', 'beetroot',
  'beetroot_soup', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken',
  'cooked_mutton', 'cooked_rabbit', 'beef', 'porkchop', 'chicken', 'mutton', 'rabbit'
]
const FOOD_CROP_BLOCKS = ['wheat', 'carrots', 'potatoes', 'beetroots']
const CHEST_BLOCK_NAMES = ['chest', 'trapped_chest']
const VILLAGE_CLUE_BLOCKS = [
  'grass_path', 'wheat', 'carrots', 'potatoes', 'beetroots',
  'white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed', 'yellow_bed',
  'lime_bed', 'pink_bed', 'gray_bed', 'light_gray_bed', 'cyan_bed',
  'purple_bed', 'blue_bed', 'brown_bed', 'green_bed', 'red_bed', 'black_bed'
]

const MOVE_TIMEOUT_MS = 6000
const DIG_TIMEOUT_MS = 5000
const CRAFT_TIMEOUT_MS = 4000
const STUCK_CHECK_INTERVAL = 3000
const STUCK_DISTANCE_THRESHOLD = 0.5
const STUCK_MAX_COUNT = 3
const BUSY_GUARD_TIMEOUT_MS = 30000

// ─── НАСТРОЙКИ ЕДЫ (НОВОЕ) ──────────────────────────────────────
const FOOD_CRITICAL = 6      // Критически мало еды — срочно искать
const FOOD_LOW = 12          // Мало еды — поесть если есть
const FOOD_OK = 16           // Достаточно — не нужно есть
const FOOD_ITEMS_MIN = 3     // Минимум еды в инвентаре для спокойствия

const OBJECTIVE_TIMEOUTS = {
  defend_hostile: 15000,
  eat_food: 8000,
  loot_chest: 20000,
  hunt_golem: 20000,
  gather_food: 40000,
  hunt_for_food: 30000,     // НОВОЕ: охота конкретно за едой
  gather_wood: 45000,
  craft_table: 30000,
  craft_planks: 15000,
  craft_sticks: 15000,
  craft_wooden_pickaxe: 25000,
  mine_stone: 45000,
  craft_stone_pickaxe: 25000,
  go_village: 30000,
  flee: 8000,
  unstick: 10000,
  swim_to_shore: 15000,     // НОВОЕ: выплыть на берег
  wander: 12000
}

const PLAYTHROUGH_KNOWLEDGE = [
  { id: 'wood_age', goal: 'Get wood and craft planks + sticks.' },
  { id: 'stone_age', goal: 'Craft wooden pickaxe, mine cobblestone, craft stone tools.' },
  { id: 'iron_age', goal: 'Mine iron ore, smelt iron, craft iron tools and armor.' },
  { id: 'diamond_age', goal: 'Find diamonds and craft diamond pickaxe.' },
  { id: 'nether_prep', goal: 'Build portal, get blaze rods + ender pearls.' },
  { id: 'stronghold', goal: 'Locate stronghold and fill end portal.' },
  { id: 'end_game', goal: 'Enter the End and defeat the Ender Dragon.' }
]

// ─── MEMORY ─────────────────────────────────────────────────────
const memoryDir = path.join(__dirname, 'memory')
const memoryFile = path.join(memoryDir, `memory-${Date.now()}.jsonl`)
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true })

function saveMemory(type, payload = {}) {
  try {
    const row = { t: new Date().toISOString(), type, payload }
    fs.appendFileSync(memoryFile, JSON.stringify(row) + '\n')
  } catch {}
}

function say(text) {
  console.log(`[BOT] ${text}`)
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withTimeout(promise, ms, label) {
  let timer = null
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ─── BOT CREATION ───────────────────────────────────────────────
const bot = mineflayer.createBot({
  host: HOST,
  port: PORT,
  username: USERNAME,
  version: VERSION
})

say(`Connecting to ${HOST}:${PORT} as ${USERNAME} (version ${VERSION})...`)
saveMemory('connect_attempt', { username: USERNAME, host: HOST, port: PORT, version: VERSION })

bot.loadPlugin(pathfinder)

let mcData = null
let followTarget = null
let autoProgressEnabled = true
let autoProgressBusy = false
let autoProgressBusySince = 0
let currentStage = 'wood_age'
let lastRoamAt = 0
let lastVillageCluePos = ''
let lastAutoTickLogAt = 0
let pathTaskActive = false
let wanderNextTurnAt = 0
let wanderNextJumpAt = 0
let lastWanderLogAt = 0
let currentObjective = null

// ─── STUCK DETECTION ────────────────────────────────────────────
let lastPositions = []
let stuckCounter = 0
let lastStuckCheckAt = 0

// ─── SWIMMING STATE (НОВОЕ) ─────────────────────────────────────
let isCurrentlySwimming = false
let swimStartedAt = 0
let lastSwimLog = 0

function checkStuck() {
  if (!bot.entity) return false
  const now = Date.now()
  if (now - lastStuckCheckAt < STUCK_CHECK_INTERVAL) return false
  lastStuckCheckAt = now

  const pos = bot.entity.position.clone()
  lastPositions.push({ pos, time: now })

  if (lastPositions.length > 10) lastPositions.shift()
  if (lastPositions.length < 3) return false

  const oldest = lastPositions[0]
  const dist = pos.distanceTo(oldest.pos)
  const elapsed = now - oldest.time

  if (elapsed > STUCK_CHECK_INTERVAL * 2.5 && dist < STUCK_DISTANCE_THRESHOLD) {
    stuckCounter++
    saveMemory('stuck_detected', { dist, elapsed, count: stuckCounter, pos })

    if (stuckCounter >= STUCK_MAX_COUNT) {
      stuckCounter = 0
      lastPositions = []
      return true
    }
  } else {
    stuckCounter = Math.max(0, stuckCounter - 1)
  }

  return false
}

async function unstick() {
  saveMemory('unstick_start', { pos: bot.entity.position })
  forceStopEverything()

  await waitMs(300)

  const randomYaw = bot.entity.yaw + Math.PI + (Math.random() - 0.5) * 1.5
  bot.look(randomYaw, 0, true)
  await waitMs(200)

  bot.setControlState('back', true)
  bot.setControlState('jump', true)
  await waitMs(600)

  bot.setControlState('back', false)
  bot.setControlState('jump', false)
  await waitMs(200)

  bot.setControlState('forward', true)
  bot.setControlState('jump', true)
  await waitMs(800)

  clearWanderControls()

  if (bot.entity.isInWater) {
    bot.setControlState('jump', true)
    bot.setControlState('forward', true)
    await waitMs(1500)
    clearWanderControls()
  }

  saveMemory('unstick_done', { pos: bot.entity.position })
}

function forceStopEverything() {
  try { bot.pathfinder.setGoal(null) } catch {}
  pathTaskActive = false
  clearWanderControls()
}

// ─── SWIMMING SYSTEM (НОВОЕ) ────────────────────────────────────
function isInWater() {
  if (!bot.entity) return false
  try {
    return bot.entity.isInWater || false
  } catch { return false }
}

function isSubmerged() {
  if (!bot.entity) return false
  try {
    const headPos = bot.entity.position.offset(0, 1.6, 0)
    const headBlock = bot.blockAt(headPos.floored())
    return headBlock && (headBlock.name === 'water' || headBlock.name === 'flowing_water')
  } catch { return false }
}

// Найти ближайший берег
function findNearestShore(maxDistance = 20) {
  if (!bot.entity) return null
  
  const pos = bot.entity.position
  let bestPos = null
  let bestDist = Infinity

  // Ищем в радиусе
  for (let dx = -maxDistance; dx <= maxDistance; dx += 2) {
    for (let dz = -maxDistance; dz <= maxDistance; dz += 2) {
      try {
        const checkPos = pos.offset(dx, 0, dz).floored()
        
        // Проверяем несколько уровней Y
        for (let dy = -3; dy <= 3; dy++) {
          const groundPos = checkPos.offset(0, dy, 0)
          const ground = bot.blockAt(groundPos)
          const above = bot.blockAt(groundPos.offset(0, 1, 0))
          const above2 = bot.blockAt(groundPos.offset(0, 2, 0))

          if (!ground || !above || !above2) continue

          // Твёрдый блок + воздух над ним = берег
          const isGround = ground.boundingBox === 'block' && 
                          ground.name !== 'water' && 
                          ground.name !== 'flowing_water' &&
                          ground.name !== 'lava' &&
                          ground.name !== 'flowing_lava'
          const isAirAbove = above.name === 'air' || above.name === 'cave_air'
          const isAirAbove2 = above2.name === 'air' || above2.name === 'cave_air'

          if (isGround && isAirAbove && isAirAbove2) {
            const dist = pos.distanceTo(groundPos)
            if (dist < bestDist) {
              bestDist = dist
              bestPos = groundPos.offset(0, 1, 0) // Стоим НА блоке
            }
          }
        }
      } catch {}
    }
  }

  return bestPos
}

// Плыть к берегу
async function swimToShore() {
  const shore = findNearestShore(25)
  
  if (!shore) {
    // Нет берега — просто плывём в случайном направлении
    const randomYaw = Math.random() * Math.PI * 2
    bot.look(randomYaw, -0.3, true)
    bot.setControlState('forward', true)
    bot.setControlState('jump', true)
    bot.setControlState('sprint', true)
    await waitMs(2000)
    return false
  }

  try {
    saveMemory('swim_to_shore_start', { target: shore, current: bot.entity.position })
    
    // Смотрим на берег
    const diff = shore.minus(bot.entity.position)
    const yaw = Math.atan2(-diff.x, -diff.z)
    bot.look(yaw, -0.2, true) // Слегка вверх

    // Плывём
    bot.setControlState('forward', true)
    bot.setControlState('jump', true)
    bot.setControlState('sprint', true)

    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      if (!isInWater()) {
        clearWanderControls()
        saveMemory('swim_to_shore_success', { pos: bot.entity.position })
        return true
      }
      
      // Обновляем направление
      const newDiff = shore.minus(bot.entity.position)
      const newYaw = Math.atan2(-newDiff.x, -newDiff.z)
      bot.look(newYaw, -0.2, true)
      
      // Держимся на плаву
      bot.setControlState('jump', true)
      
      await waitMs(200)
    }

    clearWanderControls()
    return false
  } catch (err) {
    saveMemory('swim_to_shore_fail', { msg: err.message })
    clearWanderControls()
    return false
  }
}

// Автоматическое плавание — вызывается каждые 100мс
function swimTick() {
  if (!bot.entity) return
  
  const inWater = isInWater()
  const submerged = isSubmerged()

  if (inWater) {
    // ВСЕГДА держим jump когда в воде
    bot.setControlState('jump', true)
    
    if (!isCurrentlySwimming) {
      isCurrentlySwimming = true
      swimStartedAt = Date.now()
      saveMemory('swim_start', { pos: bot.entity.position })
    }

    // Если под водой — sprint помогает плыть быстрее вверх
    if (submerged) {
      bot.setControlState('sprint', true)
    }

    // Логируем каждые 5 секунд
    const now = Date.now()
    if (now - lastSwimLog > 5000) {
      saveMemory('swimming', { 
        pos: bot.entity.position, 
        duration: now - swimStartedAt,
        submerged 
      })
      lastSwimLog = now
    }

    // Если плаваем слишком долго — пора искать берег
    if (now - swimStartedAt > 10000 && autoProgressEnabled) {
      if (!currentObjective || currentObjective.type !== 'swim_to_shore') {
        say('Swimming too long — looking for shore')
        clearObjective('replaced', 'need to find shore')
        setObjective('swim_to_shore', {})
      }
    }
  } else {
    if (isCurrentlySwimming) {
      isCurrentlySwimming = false
      saveMemory('swim_end', { 
        pos: bot.entity.position, 
        duration: Date.now() - swimStartedAt 
      })
    }
  }
}

// ─── SAFE GOTO ──────────────────────────────────────────────────
async function gotoNearWithTimeout(pos, range = 1, timeoutMs = MOVE_TIMEOUT_MS) {
  pathTaskActive = true
  clearWanderControls()
  try {
    return await withTimeout(
      bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, range)),
      timeoutMs,
      'goto'
    )
  } catch (err) {
    try { bot.pathfinder.setGoal(null) } catch {}
    if (err.message && err.message.includes('timeout')) {
      saveMemory('goto_timeout', { target: pos, range })
      return false
    }
    throw err
  } finally {
    pathTaskActive = false
  }
}

function clearWanderControls() {
  try {
    bot.setControlState('forward', false)
    bot.setControlState('back', false)
    bot.setControlState('left', false)
    bot.setControlState('right', false)
    bot.setControlState('jump', false)
    bot.setControlState('sprint', false)
  } catch {}
}

function isBotBusyWithPath() {
  try {
    if (bot.pathfinder && typeof bot.pathfinder.isMoving === 'function' && bot.pathfinder.isMoving()) {
      return true
    }
  } catch {}
  return pathTaskActive
}

// ─── OBJECTIVE MANAGEMENT ───────────────────────────────────────
function setObjective(type, data = {}) {
  if (currentObjective) {
    clearObjective('replaced', `replaced by ${type}`)
  }

  const timeout = OBJECTIVE_TIMEOUTS[type] || 30000

  currentObjective = {
    type,
    data,
    startedAt: Date.now(),
    lastProgressAt: Date.now(),
    steps: 0,
    timeoutMs: timeout
  }
  saveMemory('objective_set', { type, data, timeoutMs: timeout })
  say(`Objective: ${type} (timeout ${Math.round(timeout / 1000)}s)`)
}

function objectiveProgress(extra = {}) {
  if (!currentObjective) return
  currentObjective.lastProgressAt = Date.now()
  currentObjective.steps += 1
  saveMemory('objective_progress', {
    type: currentObjective.type,
    steps: currentObjective.steps,
    ...extra
  })
}

function clearObjective(status = 'done', reason = '') {
  if (!currentObjective) return
  saveMemory('objective_clear', {
    type: currentObjective.type,
    status,
    reason,
    durationMs: Date.now() - currentObjective.startedAt,
    steps: currentObjective.steps
  })
  say(`Objective ${currentObjective.type}: ${status}${reason ? ` (${reason})` : ''}`)
  currentObjective = null
}

function objectiveTimedOut() {
  if (!currentObjective) return false
  const timeout = currentObjective.timeoutMs || 30000
  return Date.now() - currentObjective.startedAt > timeout
}

function objectiveStalled() {
  if (!currentObjective) return false
  return currentObjective.steps === 0 &&
    Date.now() - currentObjective.startedAt > 20000
}

// ─── INVENTORY HELPERS ──────────────────────────────────────────
function itemCount(name) {
  try {
    return bot.inventory.items().reduce((sum, it) => sum + (it.name === name ? it.count : 0), 0)
  } catch { return 0 }
}

function anyItemCount(names) {
  try {
    return bot.inventory.items().reduce((sum, it) => sum + (names.includes(it.name) ? it.count : 0), 0)
  } catch { return 0 }
}

function hasAnyPickaxe() {
  return PICKAXE_NAMES.some((n) => itemCount(n) > 0)
}

function itemByNames(names) {
  try {
    return bot.inventory.items().find((it) => names.includes(it.name))
  } catch { return null }
}

function foodCount() {
  return anyItemCount(FOOD_ITEM_NAMES)
}

// ─── FOOD LOGIC (УЛУЧШЕНО) ──────────────────────────────────────
function getFoodLevel() {
  return typeof bot.food === 'number' ? bot.food : 20
}

function needsToEat() {
  return getFoodLevel() < FOOD_LOW && foodCount() > 0
}

function needsToHuntForFood() {
  // Охотимся ТОЛЬКО если:
  // 1. Еды в инвентаре мало (< FOOD_ITEMS_MIN)
  // 2. И голод критический (< FOOD_CRITICAL) ИЛИ еды вообще нет
  const food = foodCount()
  const hunger = getFoodLevel()
  
  if (food >= FOOD_ITEMS_MIN) return false  // Достаточно еды — не охотимся
  if (food === 0 && hunger < FOOD_OK) return true  // Нет еды и голодаем
  if (hunger < FOOD_CRITICAL) return true  // Критический голод
  
  return false
}

function shouldPrioritizeFood() {
  // Нужна ли срочно еда (либо поесть, либо охотиться)
  return needsToEat() || needsToHuntForFood()
}

// ─── ENTITY HELPERS ─────────────────────────────────────────────
function isHostileEntity(entity) {
  if (!entity || entity.type !== 'mob') return false
  return HOSTILE_MOBS.includes(entity.name)
}

function nearestHostile(maxDistance = 10) {
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity
    for (const e of entities) {
      if (!isHostileEntity(e) || !e.position) continue
      const d = bot.entity.position.distanceTo(e.position)
      if (d < maxDistance && d < bestDist) {
        best = e
        bestDist = d
      }
    }
    return best
  } catch { return null }
}

function nearestPassiveFoodMob(maxDistance = 20) {
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity
    for (const e of entities) {
      if (!e || e.type !== 'mob' || !PASSIVE_FOOD_MOBS.includes(e.name) || !e.position) continue
      const d = bot.entity.position.distanceTo(e.position)
      if (d < maxDistance && d < bestDist) {
        best = e
        bestDist = d
      }
    }
    return best
  } catch { return null }
}

function nearestVillager(maxDistance = 48) {
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity
    for (const e of entities) {
      if (!e || e.type !== 'mob' || e.name !== 'villager' || !e.position) continue
      const d = bot.entity.position.distanceTo(e.position)
      if (d < maxDistance && d < bestDist) {
        best = e
        bestDist = d
      }
    }
    return best
  } catch { return null }
}

function nearestIronGolem(maxDistance = 28) {
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity
    for (const e of entities) {
      if (!e || e.type !== 'mob' || !e.position) continue
      const name = String(e.name || '')
      if (name !== 'iron_golem' && name !== 'villager_golem') continue
      const d = bot.entity.position.distanceTo(e.position)
      if (d < maxDistance && d < bestDist) {
        best = e
        bestDist = d
      }
    }
    return best
  } catch { return null }
}

function entityById(id) {
  if (id === undefined || id === null) return null
  try {
    return Object.values(bot.entities || {}).find((e) => e && e.id === id) || null
  } catch { return null }
}

// ─── COMBAT ─────────────────────────────────────────────────────
async function attackEntityUntilGone(entityId, maxMs, memoryType) {
  const deadline = Date.now() + maxMs
  let hits = 0

  while (Date.now() < deadline) {
    // В воде — держимся на плаву
    if (isInWater()) {
      bot.setControlState('jump', true)
    }

    if (bot.health < 6) {
      saveMemory('flee_low_health', { health: bot.health })
      await fleeFromEntity(entityId)
      return false
    }

    const mob = entityById(entityId)
    if (!mob || !mob.isValid) return true

    try {
      const weapon = itemByNames(WEAPON_NAMES)
      if (weapon) {
        try { await bot.equip(weapon, 'hand') } catch {}
      }

      await gotoNearWithTimeout(mob.position, 2, 3000)

      if (mob.position) {
        bot.lookAt(mob.position.offset(0, 1.2, 0), true)
      }
      bot.attack(mob)
      hits++
      objectiveProgress({ action: 'attack', mob: mob.name, hits })
      saveMemory(memoryType, { mob: mob.name, pos: mob.position })
    } catch (err) {
      saveMemory(`${memoryType}_fail`, { msg: err.message })
    }
    await waitMs(420)
  }

  const left = entityById(entityId)
  return !left || !left.isValid
}

async function fleeFromEntity(entityId) {
  forceStopEverything()

  const mob = entityById(entityId)
  if (!mob || !mob.position) {
    bot.setControlState('back', true)
    bot.setControlState('sprint', true)
    bot.setControlState('jump', true)
    await waitMs(2000)
    clearWanderControls()
    return
  }

  const diff = bot.entity.position.minus(mob.position)
  const yaw = Math.atan2(-diff.x, -diff.z) + Math.PI
  bot.look(yaw, 0, true)
  await waitMs(100)

  bot.setControlState('forward', true)
  bot.setControlState('sprint', true)
  bot.setControlState('jump', true)
  await waitMs(3000)
  clearWanderControls()

  saveMemory('flee_done', { pos: bot.entity.position })
}

// ─── BLOCK FINDING ──────────────────────────────────────────────
function findNearestChest(maxDistance = 32) {
  if (!mcData) return null
  try {
    const ids = CHEST_BLOCK_NAMES
      .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
      .filter((id) => id !== null)
    if (ids.length === 0) return null
    return bot.findBlock({ matching: ids, maxDistance })
  } catch { return null }
}

function findVillageClueBlock(maxDistance = 48) {
  if (!mcData) return null
  try {
    const ids = VILLAGE_CLUE_BLOCKS
      .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
      .filter((id) => id !== null)
    if (ids.length === 0) return null
    return bot.findBlock({ matching: ids, maxDistance })
  } catch { return null }
}

function isLikelyVillageNearby() {
  return Boolean(nearestVillager(48) || findVillageClueBlock(40))
}

// ─── FOOD ACTIONS ───────────────────────────────────────────────
async function maybeEatFood() {
  if (getFoodLevel() >= FOOD_OK) return false

  const food = itemByNames(FOOD_ITEM_NAMES)
  if (!food) return false

  try {
    await bot.equip(food, 'hand')
    await withTimeout(
      new Promise((resolve, reject) => {
        bot.consume((err) => {
          if (err) return reject(err)
          resolve()
        })
      }),
      5000,
      'eat'
    )
    saveMemory('eat_success', { item: food.name, foodLevel: bot.food })
    return true
  } catch (err) {
    saveMemory('eat_fail', { item: food.name, msg: err.message })
    return false
  }
}

// Охота ЗА ЕДОЙ — только когда реально надо
async function huntForFood() {
  // Сначала пробуем собрать урожай
  const cropMined = await mineNearestBlock(FOOD_CROP_BLOCKS, 24)
  if (cropMined) {
    objectiveProgress({ action: 'harvested_crop' })
    return true
  }

  // Потом ищем моба
  const mob = nearestPassiveFoodMob(24)
  if (!mob) return false

  try {
    saveMemory('hunt_for_food_start', { mob: mob.name, pos: mob.position })
    const killed = await attackEntityUntilGone(mob.id, 15000, 'food_hunt_attack')
    if (killed) {
      objectiveProgress({ action: 'killed_for_food', mob: mob.name })
    }
    return killed
  } catch (err) {
    saveMemory('food_hunt_fail', { mob: mob.name, msg: err.message })
    return false
  }
}

// ─── TOOL EQUIPPING ─────────────────────────────────────────────
async function equipBestToolForBlock(block) {
  if (!block) return

  try {
    const name = block.name || ''

    if (LOG_NAMES.includes(name) || PLANK_NAMES.includes(name) || name === 'crafting_table') {
      const axe = itemByNames(AXE_NAMES)
      if (axe) { await bot.equip(axe, 'hand'); return }
    }

    if (['stone', 'cobblestone', 'iron_ore', 'coal_ore', 'gold_ore', 'diamond_ore',
         'redstone_ore', 'lapis_ore', 'furnace'].includes(name)) {
      const pick = itemByNames(PICKAXE_NAMES)
      if (pick) { await bot.equip(pick, 'hand'); return }
    }
  } catch {}
}

// ─── CHEST LOOTING ──────────────────────────────────────────────
async function lootNearbyVillageChest() {
  if (!isLikelyVillageNearby()) return false

  const chestBlock = findNearestChest(36)
  if (!chestBlock) return false

  try {
    await gotoNearWithTimeout(chestBlock.position, 2, 7000)
    const chest = await withTimeout(bot.openChest(chestBlock), 5000, 'open_chest')
    const items = chest.containerItems()
    let moved = 0
    for (const item of items) {
      if (moved >= 10) break
      try {
        await withTimeout(chest.withdraw(item.type, null, item.count), 2500, 'withdraw')
        moved++
      } catch {}
    }
    try { chest.close() } catch {}
    if (moved > 0) {
      saveMemory('chest_loot', { pos: chestBlock.position, stacks: moved })
      return true
    }
    return false
  } catch (err) {
    saveMemory('chest_loot_fail', { msg: err.message })
    return false
  }
}

async function huntIronGolem() {
  if (bot.health < 14) return false
  const golem = nearestIronGolem(28)
  if (!golem) return false

  try {
    return await attackEntityUntilGone(golem.id, 14000, 'golem_hunt_attack')
  } catch (err) {
    saveMemory('golem_hunt_fail', { msg: err.message })
    return false
  }
}

async function defendSelf() {
  const mob = nearestHostile(10)
  if (!mob) return false

  if (bot.health < 6) {
    await fleeFromEntity(mob.id)
    return true
  }

  try {
    return await attackEntityUntilGone(mob.id, 12000, 'defense_attack')
  } catch (err) {
    saveMemory('defense_fail', { mob: mob.name, msg: err.message })
    return false
  }
}

async function goToVillageClue() {
  const villager = nearestVillager(48)
  if (villager) {
    try {
      await gotoNearWithTimeout(villager.position, 3, 7000)
      saveMemory('village_clue_found', { block: 'villager', pos: villager.position })
      return true
    } catch (err) {
      saveMemory('village_clue_fail', { block: 'villager', msg: err.message })
    }
  }

  const clue = findVillageClueBlock(48)
  if (!clue) return false

  const key = `${clue.position.x},${clue.position.y},${clue.position.z}`
  if (key === lastVillageCluePos) return false

  try {
    await gotoNearWithTimeout(clue.position, 2, 7000)
    lastVillageCluePos = key
    saveMemory('village_clue_found', { block: clue.name, pos: clue.position })
    return true
  } catch (err) {
    saveMemory('village_clue_fail', { block: clue.name, msg: err.message })
    return false
  }
}

// ─── WANDERING ──────────────────────────────────────────────────
async function roamWorld() {
  const now = Date.now()
  if (isBotBusyWithPath()) return false

  // В воде — держимся на плаву
  if (isInWater()) {
    bot.setControlState('jump', true)
  }

  if (now >= wanderNextTurnAt) {
    const yaw = bot.entity.yaw + ((Math.random() * 2 - 1) * 1.6)
    const pitch = Math.max(-0.4, Math.min(0.35, bot.entity.pitch + ((Math.random() * 2 - 1) * 0.2)))
    bot.look(yaw, pitch, true)
    wanderNextTurnAt = now + 3000 + Math.floor(Math.random() * 4000)
  }

  const ahead = getBlockAhead()
  if (ahead && shouldAvoidBlock(ahead)) {
    bot.look(bot.entity.yaw + Math.PI * (0.5 + Math.random()), 0, true)
    wanderNextTurnAt = now + 2000
    saveMemory('wander_avoid', { block: ahead.name, pos: ahead.position })
    await waitMs(300)
    return true
  }

  bot.setControlState('forward', true)
  bot.setControlState('sprint', true)

  if (now >= wanderNextJumpAt) {
    const shouldJump = isInWater() || Math.random() < 0.22
    bot.setControlState('jump', shouldJump)
    wanderNextJumpAt = now + 800 + Math.floor(Math.random() * 1200)
  }

  if (now - lastWanderLogAt > 12000) {
    saveMemory('roam_step', { pos: bot.entity.position })
    lastWanderLogAt = now
  }

  lastRoamAt = now
  return true
}

function getBlockAhead(dist = 1.5) {
  try {
    const yaw = bot.entity.yaw
    const dx = -Math.sin(yaw) * dist
    const dz = -Math.cos(yaw) * dist
    const ahead = bot.entity.position.offset(dx, -0.5, dz)
    return bot.blockAt(ahead.floored())
  } catch { return null }
}

function shouldAvoidBlock(block) {
  if (!block) return true
  const name = block.name || ''
  if (name === 'air') return true
  if (name === 'lava' || name === 'flowing_lava') return true
  if (name === 'cactus') return true
  if (name === 'magma_block') return true
  // Воду не избегаем — умеем плавать!
  return false
}

function autoMotionTick() {
  if (!autoProgressEnabled) {
    clearWanderControls()
    return
  }
  
  // В воде — ВСЕГДА прыгаем
  if (isInWater()) {
    bot.setControlState('jump', true)
  }
  
  if (currentObjective && currentObjective.type !== 'wander') {
    // Не сбрасываем jump если в воде!
    if (!isInWater()) {
      clearWanderControls()
    }
    return
  }
  if (isBotBusyWithPath()) return
  roamWorld().catch(() => {})
}

// ─── STAGE DETECTION ────────────────────────────────────────────
function getStage() {
  if (itemCount('diamond_pickaxe') > 0) return 'diamond_age'
  if (itemCount('iron_pickaxe') > 0) return 'iron_age'
  if (itemCount('stone_pickaxe') > 0) return 'stone_age'
  if (itemCount('wooden_pickaxe') > 0) return 'stone_age'
  return 'wood_age'
}

function getStageGoal(stage) {
  const found = PLAYTHROUGH_KNOWLEDGE.find((s) => s.id === stage)
  return found ? found.goal : 'Keep progressing.'
}

// ─── CRAFTING ───────────────────────────────────────────────────
function getNearbyCraftingTable() {
  if (!mcData || !mcData.blocksByName.crafting_table) return null
  try {
    return bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 6
    })
  } catch { return null }
}

function getNearbyFurnace() {
  if (!mcData || !mcData.blocksByName.furnace) return null
  try {
    return bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 6
    })
  } catch { return null }
}

async function craftItem(itemName, amount = 1, tableBlock = null) {
  if (!mcData || !mcData.itemsByName[itemName]) return false

  const item = mcData.itemsByName[itemName]
  const recipes = bot.recipesFor(item.id, null, amount, tableBlock)
  if (!recipes || recipes.length === 0) return false

  try {
    await withTimeout(new Promise((resolve, reject) => {
      bot.craft(recipes[0], amount, tableBlock, (err) => {
        if (err) return reject(err)
        resolve()
      })
    }), CRAFT_TIMEOUT_MS, 'craft')
    saveMemory('craft_success', { item: itemName, amount })
    return true
  } catch (err) {
    saveMemory('craft_fail', { item: itemName, msg: err.message })
    return false
  }
}

async function craftAnyPlanks(amount = 1) {
  for (const plankName of PLANK_NAMES) {
    const ok = await craftItem(plankName, amount, null)
    if (ok) return true
  }
  return false
}

async function placeCraftingTableNearBot() {
  const table = getNearbyCraftingTable()
  if (table) return table

  if (itemCount('crafting_table') === 0) {
    const ok = await craftItem('crafting_table', 1, null)
    if (!ok) return null
  }

  const tableItem = bot.inventory.items().find((it) => it.name === 'crafting_table')
  if (!tableItem) return null

  try {
    await bot.equip(tableItem, 'hand')
  } catch {
    return null
  }

  const offsets = [
    new Vec3(1, 0, 0), new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1), new Vec3(0, 0, -1),
    new Vec3(1, 0, 1), new Vec3(-1, 0, -1)
  ]

  for (const off of offsets) {
    try {
      const feet = bot.entity.position.floored()
      const basePos = feet.plus(new Vec3(off.x, -1, off.z))
      const base = bot.blockAt(basePos)
      const above = bot.blockAt(basePos.offset(0, 1, 0))
      if (!base || !above) continue
      if (base.type === 0 || above.type !== 0) continue

      await bot.placeBlock(base, new Vec3(0, 1, 0))
      const placed = getNearbyCraftingTable()
      if (placed) {
        saveMemory('place_block', { block: 'crafting_table', pos: placed.position })
        return placed
      }
    } catch {}
  }

  return getNearbyCraftingTable()
}

// ─── MINING ─────────────────────────────────────────────────────
async function mineNearestBlock(blockNames, maxDistance = 16) {
  if (!mcData) return false

  const ids = blockNames
    .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
    .filter((id) => id !== null)

  if (ids.length === 0) return false

  const target = bot.findBlock({ matching: ids, maxDistance })
  if (!target) return false

  try {
    await gotoNearWithTimeout(target.position, 1, MOVE_TIMEOUT_MS)
    await equipBestToolForBlock(target)
    await withTimeout(bot.dig(target), DIG_TIMEOUT_MS, 'dig')
    saveMemory('mine_success', { block: target.name, pos: target.position })
    return true
  } catch (err) {
    saveMemory('mine_fail', { block: target.name, msg: err.message })
    return false
  }
}

// ─── OBJECTIVE CHOOSING (УЛУЧШЕННАЯ ЛОГИКА ЕДЫ) ─────────────────
function chooseNextObjective() {
  // 0. Плаваем слишком долго — нужен берег
  if (isInWater() && isCurrentlySwimming && Date.now() - swimStartedAt > 10000) {
    return { type: 'swim_to_shore' }
  }

  // 1. Самозащита
  const hostile = nearestHostile(12)
  if (hostile) {
    if (bot.health < 6) {
      return { type: 'flee', mobId: hostile.id, mobName: hostile.name }
    }
    return { type: 'defend_hostile', mobId: hostile.id, mobName: hostile.name }
  }

  // 2. ПОЕСТЬ — если голоден И есть еда
  if (needsToEat()) {
    return { type: 'eat_food' }
  }

  // 3. Деревня — сундуки (могут быть с едой!)
  if (isLikelyVillageNearby() && findNearestChest(36)) {
    return { type: 'loot_chest' }
  }

  // 4. ОХОТА ЗА ЕДОЙ — только если критически нужна И нет еды
  if (needsToHuntForFood()) {
    return { type: 'hunt_for_food' }
  }

  // 5. Голем — для железа, только если здоровы
  const golem = nearestIronGolem(28)
  if (golem && bot.health >= 14) {
    return { type: 'hunt_golem', mobId: golem.id }
  }

  const stage = getStage()

  // ─── WOOD AGE — ОСНОВНОЙ ПРИОРИТЕТ: ДЕРЕВО ───
  if (stage === 'wood_age') {
    // Всегда собираем дерево пока не наберём достаточно
    if (anyItemCount(LOG_NAMES) < 8) {
      return { type: 'gather_wood', targetLogs: 10 }
    }
    if (anyItemCount(PLANK_NAMES) < 4) {
      return { type: 'craft_planks' }
    }
    if (itemCount('crafting_table') === 0 && !getNearbyCraftingTable()) {
      return { type: 'craft_table' }
    }
    if (itemCount('stick') < 4) {
      return { type: 'craft_sticks' }
    }
    if (itemCount('wooden_pickaxe') === 0) {
      return { type: 'craft_wooden_pickaxe' }
    }
  }

  // ─── STONE AGE — ДЕРЕВО + КАМЕНЬ ───
  if (stage === 'stone_age') {
    // Дерево нужно постоянно
    if (anyItemCount(LOG_NAMES) < 12) {
      return { type: 'gather_wood', targetLogs: 16 }
    }
    if (itemCount('cobblestone') < 3) {
      return { type: 'mine_stone' }
    }
    if (itemCount('stone_pickaxe') === 0 && itemCount('cobblestone') >= 3) {
      return { type: 'craft_stone_pickaxe' }
    }
  }

  // ─── IRON AGE и выше — дерево остаётся важным ───
  if (anyItemCount(LOG_NAMES) < 16) {
    return { type: 'gather_wood', targetLogs: 20 }
  }

  // Деревня
  if (nearestVillager(48) || findVillageClueBlock(48)) {
    return { type: 'go_village' }
  }

  return { type: 'wander' }
}

// ─── EXECUTE OBJECTIVE ──────────────────────────────────────────
async function executeCurrentObjective() {
  if (!currentObjective) return
  const obj = currentObjective
  let status = 'continue'

  // В воде ВСЕГДА держим jump
  if (isInWater()) {
    bot.setControlState('jump', true)
  }

  try {
    switch (obj.type) {
      // НОВОЕ: выплыть на берег
      case 'swim_to_shore': {
        if (!isInWater()) {
          status = 'done'
          break
        }
        const reached = await swimToShore()
        status = reached ? 'done' : 'continue'
        break
      }

      case 'flee': {
        const mob = entityById(obj.data.mobId) || nearestHostile(14)
        if (mob) {
          await fleeFromEntity(mob.id)
        }
        status = 'done'
        break
      }

      case 'unstick': {
        await unstick()
        status = 'done'
        break
      }

      case 'defend_hostile': {
        const mob = entityById(obj.data.mobId) || nearestHostile(14)
        if (!mob) { status = 'done'; break }
        if (bot.health < 6) {
          await fleeFromEntity(mob.id)
          status = 'done'
          break
        }
        const finished = await attackEntityUntilGone(mob.id, 12000, 'defense_attack')
        status = finished ? 'done' : 'continue'
        break
      }

      case 'eat_food': {
        if (getFoodLevel() >= FOOD_OK) { status = 'done'; break }
        if (foodCount() === 0) { status = 'fail'; break }
        const ate = await maybeEatFood()
        status = ate ? 'done' : 'continue'
        break
      }

      // НОВОЕ: охота конкретно за едой
      case 'hunt_for_food': {
        if (foodCount() >= FOOD_ITEMS_MIN) { 
          status = 'done' 
          break 
        }
        const got = await huntForFood()
        if (got) {
          objectiveProgress({ action: 'got_food' })
        } else {
          // Не нашли еду — бродим в поисках
          await roamWorld()
        }
        status = 'continue'
        break
      }

      case 'loot_chest': {
        if (await lootNearbyVillageChest()) {
          status = 'done'
        } else if (!isLikelyVillageNearby()) {
          status = 'fail'
        } else {
          await roamWorld()
        }
        break
      }

      case 'hunt_golem': {
        if (bot.health < 12) { status = 'fail'; break }
        const golem = entityById(obj.data.mobId) || nearestIronGolem(30)
        if (!golem) { status = 'done'; break }
        const finished = await attackEntityUntilGone(golem.id, 14000, 'golem_hunt_attack')
        status = finished ? 'done' : 'continue'
        break
      }

      case 'gather_wood': {
        const target = obj.data.targetLogs || 10
        if (anyItemCount(LOG_NAMES) >= target) { status = 'done'; break }
        const mined = await mineNearestBlock(LOG_NAMES, 40) // Увеличен радиус!
        if (mined) {
          objectiveProgress({ action: 'mined_log' })
        } else {
          await roamWorld()
        }
        status = 'continue'
        break
      }

      case 'craft_planks': {
        if (anyItemCount(PLANK_NAMES) >= 8) { status = 'done'; break }
        if (anyItemCount(LOG_NAMES) === 0) {
          const mined = await mineNearestBlock(LOG_NAMES, 40)
          if (!mined) await roamWorld()
          break
        }
        const ok = await craftAnyPlanks(1)
        status = ok ? 'done' : 'fail'
        break
      }

      case 'craft_sticks': {
        if (itemCount('stick') >= 4) { status = 'done'; break }
        if (anyItemCount(PLANK_NAMES) < 2) {
          await craftAnyPlanks(1)
          break
        }
        const ok = await craftItem('stick', 1, null)
        status = ok ? 'done' : 'fail'
        break
      }

      case 'craft_table': {
        if (itemCount('crafting_table') > 0 || getNearbyCraftingTable()) { status = 'done'; break }
        if (anyItemCount(LOG_NAMES) === 0 && anyItemCount(PLANK_NAMES) < 4) {
          const mined = await mineNearestBlock(LOG_NAMES, 40)
          if (!mined) await roamWorld()
          status = 'continue'
          break
        }
        if (anyItemCount(PLANK_NAMES) < 4) {
          await craftAnyPlanks(1)
          status = 'continue'
          break
        }
        status = (await craftItem('crafting_table', 1, null)) ? 'done' : 'continue'
        break
      }

      case 'craft_wooden_pickaxe': {
        if (itemCount('wooden_pickaxe') > 0) { status = 'done'; break }
        if (itemCount('stick') < 2) {
          if (anyItemCount(PLANK_NAMES) < 2) await craftAnyPlanks(1)
          else await craftItem('stick', 1, null)
          break
        }
        if (anyItemCount(PLANK_NAMES) < 3) {
          await craftAnyPlanks(1)
          break
        }
        const table = await placeCraftingTableNearBot()
        if (!table) { status = 'fail'; break }
        status = (await craftItem('wooden_pickaxe', 1, table)) ? 'done' : 'fail'
        break
      }

      case 'mine_stone': {
        if (itemCount('cobblestone') >= 8) { status = 'done'; break }
        if (!hasAnyPickaxe()) { status = 'fail'; break }
        const pick = itemByNames(PICKAXE_NAMES)
        if (pick) try { await bot.equip(pick, 'hand') } catch {}
        const mined = await mineNearestBlock(['stone', 'cobblestone'], 20)
        if (mined) {
          objectiveProgress({ action: 'mined_stone' })
        } else {
          await roamWorld()
        }
        status = 'continue'
        break
      }

      case 'craft_stone_pickaxe': {
        if (itemCount('stone_pickaxe') > 0) { status = 'done'; break }
        if (itemCount('cobblestone') < 3) { status = 'fail'; break }
        if (itemCount('stick') < 2) {
          if (anyItemCount(PLANK_NAMES) < 2) await craftAnyPlanks(1)
          else await craftItem('stick', 1, null)
          break
        }
        const table = await placeCraftingTableNearBot()
        if (!table) { status = 'fail'; break }
        status = (await craftItem('stone_pickaxe', 1, table)) ? 'done' : 'fail'
        break
      }

      case 'go_village': {
        if (await goToVillageClue()) {
          status = 'done'
        } else {
          await roamWorld()
        }
        break
      }

      case 'wander':
      default: {
        await roamWorld()
        if (Date.now() - obj.startedAt > 12000) status = 'done'
        break
      }
    }
  } catch (err) {
    saveMemory('objective_execute_error', { type: obj.type, msg: err.message })
    status = 'fail'
  }

  if (status === 'continue') {
    objectiveProgress({ objective: obj.type })
  } else if (status === 'done') {
    clearObjective('done')
  } else if (status === 'fail') {
    clearObjective('fail', 'objective failed')
  }
}

// ─── MAIN AUTO LOOP ─────────────────────────────────────────────
async function runAutoProgress() {
  if (!autoProgressEnabled || !mcData) return

  if (autoProgressBusy) {
    if (Date.now() - autoProgressBusySince > BUSY_GUARD_TIMEOUT_MS) {
      say('Auto progress was stuck for 30s — force resetting.')
      saveMemory('busy_guard_reset', { since: autoProgressBusySince })
      autoProgressBusy = false
      forceStopEverything()
      clearObjective('fail', 'busy guard timeout')
    } else {
      return
    }
  }

  autoProgressBusy = true
  autoProgressBusySince = Date.now()

  try {
    const now = Date.now()

    if (now - lastAutoTickLogAt > 30000) {
      currentStage = getStage()
      saveMemory('auto_tick', {
        pos: bot.entity.position,
        food: bot.food,
        health: bot.health,
        stage: currentStage,
        objective: currentObjective ? currentObjective.type : null,
        stuckCounter,
        foodItems: foodCount(),
        logs: anyItemCount(LOG_NAMES),
        inWater: isInWater()
      })
      lastAutoTickLogAt = now
    }

    const isStuck = checkStuck()
    if (isStuck) {
      say('Detected stuck — running unstick maneuver')
      clearObjective('fail', 'stuck detected')
      forceStopEverything()
      setObjective('unstick', {})
    }

    if (objectiveTimedOut()) {
      say(`Objective ${currentObjective.type} timed out`)
      clearObjective('fail', 'timeout')
      forceStopEverything()
    }

    if (objectiveStalled()) {
      say(`Objective ${currentObjective.type} stalled (no progress)`)
      clearObjective('fail', 'stalled')
    }

    if (!currentObjective) {
      const next = chooseNextObjective()
      setObjective(next.type, next)
    }

    await executeCurrentObjective()
  } catch (err) {
    saveMemory('auto_progress_error', { msg: err.message, stack: err.stack })
    clearObjective('fail', err.message)
    forceStopEverything()
  } finally {
    autoProgressBusy = false
  }
}

// ─── OBSERVERS ──────────────────────────────────────────────────
function observeAndLearn() {
  try {
    const players = Object.values(bot.players || {})
      .filter((p) => p && p.entity && p.username !== bot.username)
    if (!players.length) return
    players.forEach((p) => {
      saveMemory('player_seen', { user: p.username, pos: p.entity.position })
    })
  } catch {}
}

function tryFollowPlayer() {
  if (autoProgressEnabled) return
  if (!followTarget) return
  try {
    const target = bot.players[followTarget]
    if (!target || !target.entity) return
    const goal = new goals.GoalFollow(target.entity, 2)
    bot.pathfinder.setGoal(goal, true)
  } catch {}
}

// ─── HEALTH & SWIM MONITOR ──────────────────────────────────────
function healthMonitor() {
  if (!bot.entity) return

  // Плавание
  swimTick()

  // Проверяем здоровье
  if (bot.health < 6 && autoProgressEnabled) {
    const hostile = nearestHostile(12)
    if (hostile && currentObjective && currentObjective.type !== 'flee') {
      say('Low health! Fleeing!')
      clearObjective('fail', 'low health flee')
      forceStopEverything()
      setObjective('flee', { mobId: hostile.id, mobName: hostile.name })
    }
  }

  // Проверяем лаву
  try {
    const feetBlock = bot.blockAt(bot.entity.position.floored())
    if (feetBlock && (feetBlock.name === 'lava' || feetBlock.name === 'flowing_lava')) {
      saveMemory('in_lava', { pos: bot.entity.position })
      bot.setControlState('jump', true)
      bot.setControlState('forward', true)
    }
  } catch {}
}

// ─── SPAWN ──────────────────────────────────────────────────────
bot.once('spawn', () => {
  try {
    mcData = require('minecraft-data')(bot.version)
  } catch (err) {
    say(`Could not load minecraft-data: ${err.message}`)
  }

  try {
    const defaultMove = new Movements(bot, mcData)
    defaultMove.canDig = true
    defaultMove.allow1by1towers = true
    defaultMove.allowFreeMotion = true
    defaultMove.allowSprinting = true
    bot.pathfinder.setMovements(defaultMove)
  } catch (err) {
    say(`Pathfinder setup error: ${err.message}`)
  }

  say(`Connected as ${USERNAME} to ${HOST}:${PORT} (v${VERSION})`)
  saveMemory('spawn', { username: USERNAME, host: HOST, port: PORT, version: VERSION })
  saveMemory('knowledge_bootstrap', { roadmap: PLAYTHROUGH_KNOWLEDGE })
  announceCommandsInChat()

  setInterval(observeAndLearn, 4000)
  setInterval(tryFollowPlayer, 1500)
  setInterval(runAutoProgress, 3500)
  setInterval(autoMotionTick, 900)
  setInterval(healthMonitor, 100)  // Чаще! Для плавания
})

// ─── EVENTS ─────────────────────────────────────────────────────
bot.on('blockUpdate', (oldBlock, newBlock) => {
  try {
    if (!oldBlock || !newBlock) return
    if (oldBlock.type !== 0 && newBlock.type === 0) {
      saveMemory('block_broken_detected', { block: oldBlock.name, pos: oldBlock.position })
    }
  } catch {}
})

bot.on('death', () => {
  saveMemory('death', { pos: bot.entity ? bot.entity.position : null })
  say('Bot died! Resetting objective.')
  forceStopEverything()
  clearObjective('fail', 'death')
  lastPositions = []
  stuckCounter = 0
  isCurrentlySwimming = false
})

bot.on('respawn', () => {
  saveMemory('respawn', {})
  say('Respawned.')
  lastPositions = []
  stuckCounter = 0
  isCurrentlySwimming = false
})

bot.on('path_update', (results) => {
  if (results.status === 'noPath') {
    saveMemory('path_no_path', { pos: bot.entity ? bot.entity.position : null })
    try { bot.pathfinder.setGoal(null) } catch {}
    pathTaskActive = false
  }
})

// ─── CHAT ───────────────────────────────────────────────────────
function sendRoadmapToChat() {
  const objective = currentObjective 
    ? `${currentObjective.type} (${Math.round((Date.now() - currentObjective.startedAt) / 1000)}s)` 
    : 'none'
  const swimming = isInWater() ? ' [SWIMMING]' : ''
  bot.chat(`Auto: ${autoProgressEnabled ? 'ON' : 'OFF'} | Stage: ${currentStage} | Obj: ${objective} | HP:${Math.round(bot.health)} Food:${bot.food}/${foodCount()}items${swimming}`)
}

function announceCommandsInChat() {
  bot.chat('Commands: "leave", "inventory", "bot status", "bot auto on/off", "bot follow me", "bot stop", "bot memory".')
  setTimeout(() => {
    bot.chat('Can swim! Prioritizes wood. Hunts only when hungry & no food.')
  }, 500)
}

function sendInventoryToChat() {
  const grouped = {}
  for (const it of bot.inventory.items()) {
    grouped[it.name] = (grouped[it.name] || 0) + it.count
  }
  const items = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}x${count}`)
  if (items.length === 0) { bot.chat('Inventory is empty.'); return }
  const preview = items.slice(0, 10).join(', ')
  const extra = items.length > 10 ? ` (+${items.length - 10} more)` : ''
  bot.chat(`Inventory: ${preview}${extra}`)
}

function gracefulLeave() {
  saveMemory('leave_command', { by: 'chat' })
  bot.chat('Leaving now.')
  setTimeout(() => bot.quit('leave'), 300)
}

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  saveMemory('chat', { from: username, message })
  const txt = message.toLowerCase().trim()

  if (txt === 'leave' || txt === 'bot leave') { gracefulLeave(); return }
  if (txt === 'inventory' || txt === 'bot inventory') { sendInventoryToChat(); return }

  if (txt === 'bot stop') {
    forceStopEverything()
    autoProgressEnabled = false
    clearObjective('stopped', 'manual stop')
    bot.chat('Stopped. Auto progression is OFF.')
    return
  }

  if (txt === 'bot auto on') {
    autoProgressEnabled = true
    followTarget = null
    forceStopEverything()
    autoProgressBusy = false
    wanderNextTurnAt = 0
    lastPositions = []
    stuckCounter = 0
    isCurrentlySwimming = false
    if (!currentObjective) {
      const next = chooseNextObjective()
      setObjective(next.type, next)
    }
    bot.chat('Auto progression is ON.')
    return
  }

  if (txt === 'bot auto off') {
    autoProgressEnabled = false
    clearObjective('paused', 'auto off')
    clearWanderControls()
    bot.chat('Auto progression is OFF.')
    return
  }

  if (txt === 'bot follow me') {
    if (autoProgressEnabled) {
      bot.chat('Auto is ON. Turn it off first: bot auto off')
      return
    }
    followTarget = username
    bot.chat(`OK, following ${username}`)
    return
  }

  if (txt === 'bot memory') { bot.chat(`Memory file: ${path.basename(memoryFile)}`); return }
  if (txt === 'bot status' || txt === 'bot goal' || txt === 'bot knowledge') { sendRoadmapToChat(); return }
})

// ─── ERROR HANDLING ─────────────────────────────────────────────
function printHintFromReason(reasonText) {
  const r = String(reasonText || '').toLowerCase()
  if (r.includes('already') && r.includes('logged')) {
    say('Hint: this username is already on the server.')
  } else if (r.includes('verify username') || r.includes('online mode') || r.includes('authentication')) {
    say('Hint: server is in online-mode.')
  } else if (r.includes('connection refused') || r.includes('econnrefused')) {
    say('Hint: wrong LAN port or world is not open to LAN.')
  }
}

bot.on('kicked', (reason) => {
  saveMemory('kicked', { reason })
  say(`Kicked: ${reason}`)
  printHintFromReason(reason)
})

bot.on('error', (err) => {
  saveMemory('error', { where: 'bot', msg: err.message })
  say(`Error: ${err.message}`)
  printHintFromReason(err.message)
})

bot.on('end', (reason) => {
  saveMemory('end', { reason: reason || 'unknown' })
  say(`Disconnected. Reason: ${reason || 'unknown'}`)
  printHintFromReason(reason)
})

process.on('SIGINT', () => {
  saveMemory('shutdown', { by: 'SIGINT' })
  try { bot.quit('bye') } catch {}
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  saveMemory('uncaught_exception', { msg: err.message, stack: err.stack })
  say(`Fatal error: ${err.message}`)
})

process.on('unhandledRejection', (err) => {
  const msg = err && err.message ? err.message : String(err)
  saveMemory('unhandled_rejection', { msg })
  say(`Unhandled rejection: ${msg}`)
})

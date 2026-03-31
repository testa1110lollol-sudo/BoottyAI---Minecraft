const fs = require('fs')
const path = require('path')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { Vec3 } = require('vec3')

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
const FOOD_ITEM_NAMES = [
  'bread',
  'apple',
  'carrot',
  'potato',
  'baked_potato',
  'beetroot',
  'beetroot_soup',
  'cooked_beef',
  'cooked_porkchop',
  'cooked_chicken',
  'cooked_mutton',
  'cooked_rabbit',
  'beef',
  'porkchop',
  'chicken',
  'mutton',
  'rabbit'
]
const FOOD_CROP_BLOCKS = ['wheat', 'carrots', 'potatoes', 'beetroots']
const CHEST_BLOCK_NAMES = ['chest', 'trapped_chest']
const VILLAGE_CLUE_BLOCKS = [
  'grass_path',
  'wheat',
  'carrots',
  'potatoes',
  'beetroots',
  'white_bed',
  'orange_bed',
  'magenta_bed',
  'light_blue_bed',
  'yellow_bed',
  'lime_bed',
  'pink_bed',
  'gray_bed',
  'light_gray_bed',
  'cyan_bed',
  'purple_bed',
  'blue_bed',
  'brown_bed',
  'green_bed',
  'red_bed',
  'black_bed'
]
const MOVE_TIMEOUT_MS = 8000
const DIG_TIMEOUT_MS = 6000
const CRAFT_TIMEOUT_MS = 15000
const OBJECTIVE_TIMEOUT_MS = 90000

const PLAYTHROUGH_KNOWLEDGE = [
  { id: 'wood_age', goal: 'Get wood and craft planks + sticks.' },
  { id: 'stone_age', goal: 'Craft wooden pickaxe, mine cobblestone, craft stone tools.' },
  { id: 'iron_age', goal: 'Mine iron ore, smelt iron, craft iron tools and armor.' },
  { id: 'diamond_age', goal: 'Find diamonds and craft diamond pickaxe.' },
  { id: 'nether_prep', goal: 'Build portal, get blaze rods + ender pearls.' },
  { id: 'stronghold', goal: 'Locate stronghold and fill end portal.' },
  { id: 'end_game', goal: 'Enter the End and defeat the Ender Dragon.' }
]

const CHAT_COMMANDS = [
  'leave / bot leave - disconnect bot',
  'inventory / bot inventory - show bot inventory',
  'bot status - show current auto mode and progress',
  'bot auto on - enable self progression',
  'bot auto off - disable self progression',
  'bot follow me - follow you (works only when auto is OFF)',
  'bot stop - stop movement and disable auto',
  'bot memory - show memory file name'
]

const memoryDir = path.join(__dirname, 'memory')
const memoryFile = path.join(memoryDir, `memory-${Date.now()}.jsonl`)
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true })

function saveMemory(type, payload = {}) {
  const row = {
    t: new Date().toISOString(),
    type,
    payload
  }
  fs.appendFileSync(memoryFile, JSON.stringify(row) + '\n')
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
        timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

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
    bot.pathfinder.setGoal(null)
    throw err
  } finally {
    pathTaskActive = false
  }
}

function clearWanderControls() {
  bot.setControlState('forward', false)
  bot.setControlState('back', false)
  bot.setControlState('left', false)
  bot.setControlState('right', false)
  bot.setControlState('jump', false)
  bot.setControlState('sprint', false)
}

function isBotBusyWithPath() {
  const moving = bot.pathfinder && typeof bot.pathfinder.isMoving === 'function'
    ? bot.pathfinder.isMoving()
    : false
  return pathTaskActive || moving
}

function setObjective(type, data = {}) {
  currentObjective = {
    type,
    data,
    startedAt: Date.now(),
    lastProgressAt: Date.now(),
    steps: 0
  }
  saveMemory('objective_set', { type, data })
  say(`Objective set: ${type}`)
}

function objectiveProgress(extra = {}) {
  if (!currentObjective) return
  currentObjective.lastProgressAt = Date.now()
  currentObjective.steps += 1
  saveMemory('objective_progress', { type: currentObjective.type, steps: currentObjective.steps, ...extra })
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
  currentObjective = null
}

function objectiveTimedOut() {
  if (!currentObjective) return false
  return Date.now() - currentObjective.startedAt > OBJECTIVE_TIMEOUT_MS
}

function printHintFromReason(reasonText) {
  const r = String(reasonText || '').toLowerCase()
  if (r.includes('already') && r.includes('logged')) {
    say('Hint: this username is already on the server. Use a different bot username.')
    return
  }
  if (r.includes('verify username') || r.includes('online mode') || r.includes('authentication')) {
    say('Hint: server is in online-mode. Random offline usernames are blocked there.')
    return
  }
  if (r.includes('connection refused') || r.includes('econnrefused')) {
    say('Hint: wrong LAN port or world is not open to LAN yet.')
  }
}

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
let currentStage = 'wood_age'
let lastRoamAt = 0
let lastVillageCluePos = ''
let lastAutoTickLogAt = 0
let pathTaskActive = false
let wanderNextTurnAt = 0
let wanderNextJumpAt = 0
let lastWanderLogAt = 0
let currentObjective = null

bot.once('spawn', () => {
  try {
    mcData = require('minecraft-data')(bot.version)
  } catch (err) {
    say(`Could not load minecraft-data: ${err.message}`)
  }

  const defaultMove = new Movements(bot, mcData)
  bot.pathfinder.setMovements(defaultMove)

  say(`Connected as ${USERNAME} to ${HOST}:${PORT} (v${VERSION})`)
  saveMemory('spawn', { username: USERNAME, host: HOST, port: PORT, version: VERSION })
  saveMemory('knowledge_bootstrap', { roadmap: PLAYTHROUGH_KNOWLEDGE })
  announceCommandsInChat()

  setInterval(observeAndLearn, 4000)
  setInterval(tryFollowPlayer, 1500)
  setInterval(runAutoProgress, 3500)
  setInterval(autoMotionTick, 900)
})

function itemCount(name) {
  return bot.inventory.items().reduce((sum, it) => sum + (it.name === name ? it.count : 0), 0)
}

function anyItemCount(names) {
  return bot.inventory.items().reduce((sum, it) => sum + (names.includes(it.name) ? it.count : 0), 0)
}

function hasAnyPickaxe() {
  return PICKAXE_NAMES.some((n) => itemCount(n) > 0)
}

function itemByNames(names) {
  return bot.inventory.items().find((it) => names.includes(it.name))
}

function itemCountByNames(names) {
  return bot.inventory.items().reduce((sum, it) => sum + (names.includes(it.name) ? it.count : 0), 0)
}

function foodCount() {
  return anyItemCount(FOOD_ITEM_NAMES)
}

function isHostileEntity(entity) {
  if (!entity || entity.type !== 'mob') return false
  return HOSTILE_MOBS.includes(entity.name)
}

function nearestHostile(maxDistance = 10) {
  const entities = Object.values(bot.entities || {})
  let best = null
  let bestDist = Number.POSITIVE_INFINITY

  for (const e of entities) {
    if (!isHostileEntity(e) || !e.position) continue
    const d = bot.entity.position.distanceTo(e.position)
    if (d < maxDistance && d < bestDist) {
      best = e
      bestDist = d
    }
  }
  return best
}

function nearestPassiveFoodMob(maxDistance = 20) {
  const entities = Object.values(bot.entities || {})
  let best = null
  let bestDist = Number.POSITIVE_INFINITY

  for (const e of entities) {
    if (!e || e.type !== 'mob' || !PASSIVE_FOOD_MOBS.includes(e.name) || !e.position) continue
    const d = bot.entity.position.distanceTo(e.position)
    if (d < maxDistance && d < bestDist) {
      best = e
      bestDist = d
    }
  }
  return best
}

function nearestVillager(maxDistance = 48) {
  const entities = Object.values(bot.entities || {})
  let best = null
  let bestDist = Number.POSITIVE_INFINITY

  for (const e of entities) {
    if (!e || e.type !== 'mob' || e.name !== 'villager' || !e.position) continue
    const d = bot.entity.position.distanceTo(e.position)
    if (d < maxDistance && d < bestDist) {
      best = e
      bestDist = d
    }
  }
  return best
}

function nearestIronGolem(maxDistance = 28) {
  const entities = Object.values(bot.entities || {})
  let best = null
  let bestDist = Number.POSITIVE_INFINITY

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
}

function entityById(id) {
  if (id === undefined || id === null) return null
  return Object.values(bot.entities || {}).find((e) => e && e.id === id) || null
}

async function attackEntityUntilGone(entityId, maxMs, memoryType) {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const mob = entityById(entityId)
    if (!mob || !mob.isValid) return true

    try {
      const weapon = itemByNames(WEAPON_NAMES)
      if (weapon) {
        try { await bot.equip(weapon, 'hand') } catch {}
      }
      await gotoNearWithTimeout(mob.position, 2, 3500)
      bot.lookAt(mob.position.offset(0, 1.2, 0), true)
      bot.attack(mob)
      objectiveProgress({ action: 'attack', mob: mob.name })
      saveMemory(memoryType, { mob: mob.name, pos: mob.position })
    } catch (err) {
      saveMemory(`${memoryType}_fail`, { msg: err.message })
    }
    await waitMs(420)
  }
  const left = entityById(entityId)
  return !left || !left.isValid
}

function findNearestChest(maxDistance = 32) {
  if (!mcData) return null
  const ids = CHEST_BLOCK_NAMES
    .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
    .filter((id) => id !== null)
  if (ids.length === 0) return null

  return bot.findBlock({
    matching: ids,
    maxDistance
  })
}

async function maybeEatFood() {
  if (typeof bot.food !== 'number') return false
  if (bot.food >= 16) return false

  const food = itemByNames(FOOD_ITEM_NAMES)
  if (!food) return false

  try {
    await bot.equip(food, 'hand')
    await new Promise((resolve, reject) => {
      bot.consume((err) => {
        if (err) return reject(err)
        resolve()
      })
    })
    saveMemory('eat_success', { item: food.name, foodLevel: bot.food })
    return true
  } catch (err) {
    saveMemory('eat_fail', { item: food.name, msg: err.message })
    return false
  }
}

function isLikelyVillageNearby() {
  return Boolean(nearestVillager(48) || findVillageClueBlock(40))
}

async function lootNearbyVillageChest() {
  if (!isLikelyVillageNearby()) return false

  const chestBlock = findNearestChest(36)
  if (!chestBlock) return false

  try {
    await gotoNearWithTimeout(chestBlock.position, 2, 7000)
    const chest = await bot.openChest(chestBlock)
    const items = chest.containerItems()
    let moved = 0
    for (const item of items) {
      if (moved >= 10) break
      try {
        await withTimeout(chest.withdraw(item.type, null, item.count), 2500, 'withdraw')
        moved++
      } catch {
        // Keep looting other stacks.
      }
    }
    chest.close()
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

function findVillageClueBlock(maxDistance = 48) {
  if (!mcData) return null
  const ids = VILLAGE_CLUE_BLOCKS
    .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
    .filter((id) => id !== null)

  if (ids.length === 0) return null

  return bot.findBlock({
    matching: ids,
    maxDistance
  })
}

async function defendSelf() {
  const mob = nearestHostile(10)
  if (!mob) return false

  try {
    return await attackEntityUntilGone(mob.id, 12000, 'defense_attack')
  } catch (err) {
    saveMemory('defense_fail', { mob: mob.name, msg: err.message })
    return false
  }
}

async function gatherFood() {
  if (foodCount() >= 6) return false

  const cropMined = await mineNearestBlock(FOOD_CROP_BLOCKS, 24)
  if (cropMined) return true

  const mob = nearestPassiveFoodMob(24)
  if (!mob) return false

  try {
    return await attackEntityUntilGone(mob.id, 9000, 'food_hunt_attack')
  } catch (err) {
    saveMemory('food_hunt_fail', { mob: mob.name, msg: err.message })
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

async function roamWorld() {
  const now = Date.now()
  if (isBotBusyWithPath()) return false

  if (now >= wanderNextTurnAt) {
    const yaw = bot.entity.yaw + ((Math.random() * 2 - 1) * 1.6)
    const pitch = Math.max(-0.4, Math.min(0.35, bot.entity.pitch + ((Math.random() * 2 - 1) * 0.2)))
    bot.look(yaw, pitch, true)
    wanderNextTurnAt = now + 3000 + Math.floor(Math.random() * 4000)
  }

  bot.setControlState('forward', true)
  bot.setControlState('sprint', true)

  if (now >= wanderNextJumpAt) {
    const shouldJump = bot.entity.isInWater || Math.random() < 0.22
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

function autoMotionTick() {
  if (!autoProgressEnabled) {
    clearWanderControls()
    return
  }
  if (currentObjective && currentObjective.type !== 'wander') {
    clearWanderControls()
    return
  }
  if (isBotBusyWithPath()) return
  roamWorld().catch(() => {})
}

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

function getNearbyCraftingTable() {
  if (!mcData || !mcData.blocksByName.crafting_table) return null
  const tableId = mcData.blocksByName.crafting_table.id
  return bot.findBlock({
    matching: tableId,
    maxDistance: 6
  })
}

function getNearbyFurnace() {
  if (!mcData || !mcData.blocksByName.furnace) return null
  const furnaceId = mcData.blocksByName.furnace.id
  return bot.findBlock({
    matching: furnaceId,
    maxDistance: 6
  })
}

async function craftItem(itemName, amount = 1, tableBlock = null) {
  if (!mcData || !mcData.itemsByName[itemName]) return false

  clearWanderControls()
  bot.pathfinder.setGoal(null)

  const item = mcData.itemsByName[itemName]
  const recipes = bot.recipesFor(item.id, null, amount, tableBlock)
  if (!recipes || recipes.length === 0) return false
  const beforeCount = itemCount(itemName)

  try {
    await withTimeout(new Promise((resolve, reject) => {
      bot.craft(recipes[0], amount, tableBlock, (err) => {
        if (err) return reject(err)
        resolve()
      })
    }), CRAFT_TIMEOUT_MS, 'craft')
    await waitMs(250)
    const afterCount = itemCount(itemName)
    saveMemory('craft_success', { item: itemName, amount, beforeCount, afterCount })
    return true
  } catch (err) {
    await waitMs(400)
    const afterCount = itemCount(itemName)
    if (afterCount > beforeCount) {
      saveMemory('craft_success', {
        item: itemName,
        amount,
        beforeCount,
        afterCount,
        recoveredAfterError: err.message
      })
      return true
    }
    saveMemory('craft_fail', { item: itemName, msg: err.message, beforeCount, afterCount })
    return false
  }
}

async function craftAnyPlanks(amount = 1) {
  const plankPriority = [
    ['oak_log', 'oak_planks'],
    ['spruce_log', 'spruce_planks'],
    ['birch_log', 'birch_planks'],
    ['jungle_log', 'jungle_planks'],
    ['acacia_log', 'acacia_planks'],
    ['dark_oak_log', 'dark_oak_planks']
  ]

  for (const [logName, plankName] of plankPriority) {
    if (itemCount(logName) <= 0) continue
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
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1)
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
    } catch {
      // Try next place candidate.
    }
  }

  return getNearbyCraftingTable()
}

async function mineNearestBlock(blockNames, maxDistance = 16) {
  if (!mcData) return false

  const ids = blockNames
    .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
    .filter((id) => id !== null)

  if (ids.length === 0) return false

  const target = bot.findBlock({
    matching: ids,
    maxDistance
  })

  if (!target) return false

  try {
    await gotoNearWithTimeout(target.position, 1, MOVE_TIMEOUT_MS)
    await withTimeout(bot.dig(target), DIG_TIMEOUT_MS, 'dig')
    saveMemory('mine_success', { block: target.name, pos: target.position })
    return true
  } catch (err) {
    saveMemory('mine_fail', { block: target.name, msg: err.message })
    return false
  }
}

function chooseNextObjective() {
  const hostile = nearestHostile(12)
  if (hostile) return { type: 'defend_hostile', mobId: hostile.id, mobName: hostile.name }

  if (typeof bot.food === 'number' && bot.food < 14 && foodCount() > 0) {
    return { type: 'eat_food' }
  }

  if (isLikelyVillageNearby() && findNearestChest(36)) {
    return { type: 'loot_chest' }
  }

  const golem = nearestIronGolem(28)
  if (golem && bot.health >= 14) {
    return { type: 'hunt_golem', mobId: golem.id }
  }

  if (foodCount() < 5) {
    return { type: 'gather_food' }
  }

  if (anyItemCount(LOG_NAMES) < 6) {
    return { type: 'gather_wood', targetLogs: 6 }
  }

  if (itemCount('crafting_table') === 0 && !getNearbyCraftingTable()) {
    return { type: 'craft_table' }
  }

  if (nearestVillager(48) || findVillageClueBlock(48)) {
    return { type: 'go_village' }
  }

  return { type: 'wander' }
}

async function executeCurrentObjective() {
  if (!currentObjective) return
  const obj = currentObjective
  let status = 'continue'

  switch (obj.type) {
    case 'defend_hostile': {
      const mob = entityById(obj.data.mobId) || nearestHostile(14)
      if (!mob) {
        status = 'done'
        break
      }
      const finished = await attackEntityUntilGone(mob.id, 12000, 'defense_attack')
      status = finished ? 'done' : 'continue'
      break
    }
    case 'eat_food': {
      if (typeof bot.food === 'number' && bot.food >= 18) {
        status = 'done'
        break
      }
      status = (await maybeEatFood()) ? 'done' : 'fail'
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
      if (bot.health < 12) {
        status = 'fail'
        break
      }
      const golem = entityById(obj.data.mobId) || nearestIronGolem(30)
      if (!golem) {
        status = 'done'
        break
      }
      const finished = await attackEntityUntilGone(golem.id, 14000, 'golem_hunt_attack')
      status = finished ? 'done' : 'continue'
      break
    }
    case 'gather_food': {
      if (foodCount() >= 8) {
        status = 'done'
        break
      }
      const progressed = await gatherFood()
      if (!progressed) await roamWorld()
      status = 'continue'
      break
    }
    case 'gather_wood': {
      const target = obj.data.targetLogs || 6
      if (anyItemCount(LOG_NAMES) >= target) {
        status = 'done'
        break
      }
      const mined = await mineNearestBlock(LOG_NAMES, 26)
      if (!mined) await roamWorld()
      status = 'continue'
      break
    }
    case 'craft_table': {
      if (itemCount('crafting_table') > 0 || getNearbyCraftingTable()) {
        status = 'done'
        break
      }
      if (anyItemCount(LOG_NAMES) === 0 && anyItemCount(PLANK_NAMES) < 4) {
        const mined = await mineNearestBlock(LOG_NAMES, 26)
        if (!mined) await roamWorld()
        status = 'continue'
        break
      }
      if (anyItemCount(PLANK_NAMES) < 4) {
        const craftedPlanks = await craftAnyPlanks(1)
        if (!craftedPlanks) await roamWorld()
        status = 'continue'
        break
      }
      status = (await craftItem('crafting_table', 1, null)) ? 'done' : 'continue'
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
      if (Date.now() - obj.startedAt > 15000) status = 'done'
      break
    }
  }

  if (status === 'continue') {
    objectiveProgress({ objective: obj.type })
  } else if (status === 'done') {
    clearObjective('done')
  } else if (status === 'fail') {
    clearObjective('fail', 'objective failed')
  }
}

async function runAutoProgress() {
  if (!autoProgressEnabled || autoProgressBusy || !mcData) return

  autoProgressBusy = true

  try {
    const now = Date.now()
    if (now - lastAutoTickLogAt > 30000) {
      currentStage = getStage()
      saveMemory('auto_tick', {
        pos: bot.entity.position,
        food: bot.food,
        health: bot.health,
        stage: currentStage,
        objective: currentObjective ? currentObjective.type : null
      })
      lastAutoTickLogAt = now
    }

    if (objectiveTimedOut()) {
      clearObjective('fail', 'timeout')
    }

    if (!currentObjective) {
      const next = chooseNextObjective()
      setObjective(next.type, next)
    }

    await executeCurrentObjective()
  } catch (err) {
    saveMemory('auto_progress_error', { msg: err.message })
    clearObjective('fail', err.message)
  } finally {
    autoProgressBusy = false
  }
}

function observeAndLearn() {
  const players = Object.values(bot.players || {})
    .filter((p) => p && p.entity && p.username !== bot.username)

  if (!players.length) return

  players.forEach((p) => {
    saveMemory('player_seen', {
      user: p.username,
      pos: p.entity.position
    })
  })
}

function tryFollowPlayer() {
  if (autoProgressEnabled) return
  if (!followTarget) return
  const target = bot.players[followTarget]
  if (!target || !target.entity) return

  const goal = new goals.GoalFollow(target.entity, 2)
  bot.pathfinder.setGoal(goal, true)
}

bot.on('blockUpdate', (oldBlock, newBlock) => {
  try {
    if (!oldBlock || !newBlock) return

    if (oldBlock.type !== 0 && newBlock.type === 0) {
      saveMemory('block_broken_detected', {
        block: oldBlock.name,
        pos: oldBlock.position
      })

      if (autoProgressEnabled) return
      imitateBreaking(oldBlock.name)
    }
  } catch (err) {
    saveMemory('error', { where: 'blockUpdate', msg: err.message })
  }
})

async function imitateBreaking(blockName) {
  if (!mcData) return
  const similar = bot.findBlock({
    matching: (b) => b && b.name === blockName,
    maxDistance: 5
  })
  if (!similar) return

  try {
    await bot.pathfinder.goto(new goals.GoalNear(similar.position.x, similar.position.y, similar.position.z, 1))
    await bot.dig(similar)
    saveMemory('imitate_dig_success', { block: blockName, pos: similar.position })
  } catch (err) {
    saveMemory('imitate_dig_fail', { block: blockName, msg: err.message })
  }
}

function sendRoadmapToChat() {
  const objective = currentObjective ? currentObjective.type : 'none'
  bot.chat(`Auto: ${autoProgressEnabled ? 'ON' : 'OFF'} | Stage: ${currentStage} | objective: ${objective}`)
}

function announceCommandsInChat() {
  bot.chat('Commands: "leave", "inventory", "bot status", "bot auto on/off", "bot follow me", "bot stop", "bot memory".')
  setTimeout(() => {
    bot.chat('Auto mode uses ONE objective at a time and finishes it before switching.')
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

  if (items.length === 0) {
    bot.chat('Inventory is empty.')
    return
  }

  const preview = items.slice(0, 10).join(', ')
  const extra = items.length > 10 ? ` (+${items.length - 10} more)` : ''
  bot.chat(`Inventory: ${preview}${extra}`)
}

function gracefulLeave() {
  saveMemory('leave_command', { by: 'chat' })
  bot.chat('Leaving now.')
  setTimeout(() => {
    bot.quit('leave')
  }, 300)
}

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  saveMemory('chat', { from: username, message })

  const txt = message.toLowerCase().trim()

  if (txt === 'leave' || txt === 'bot leave') {
    gracefulLeave()
    return
  }

  if (txt === 'inventory' || txt === 'bot inventory') {
    sendInventoryToChat()
    return
  }

  if (txt === 'bot stop') {
    bot.pathfinder.setGoal(null)
    autoProgressEnabled = false
    clearObjective('stopped', 'manual stop')
    clearWanderControls()
    bot.chat('Stopped. Auto progression is OFF.')
    return
  }

  if (txt === 'bot auto on') {
    autoProgressEnabled = true
    followTarget = null
    bot.pathfinder.setGoal(null)
    pathTaskActive = false
    wanderNextTurnAt = 0
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

  if (txt === 'bot memory') {
    bot.chat(`Memory file: ${path.basename(memoryFile)}`)
    return
  }

  if (txt === 'bot status' || txt === 'bot goal' || txt === 'bot knowledge') {
    sendRoadmapToChat()
    return
  }
})

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
  bot.quit('bye')
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

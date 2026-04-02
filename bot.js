const fs = require('fs')
const path = require('path')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { Vec3 } = require('vec3')

// в”Ђв”Ђв”Ђ CONFIG в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
const FUEL_ITEM_NAMES = ['coal', 'coal_block', 'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log']
const FOOD_CROP_BLOCKS = ['wheat', 'carrots', 'potatoes', 'beetroots']
const CHEST_BLOCK_NAMES = ['chest', 'trapped_chest']
const DROP_ALWAYS_USEFUL = [
  'stick', 'crafting_table', 'furnace', 'coal', 'coal_block', 'torch',
  'water_bucket', 'bucket', 'iron_ingot', 'gold_ingot', 'diamond',
  'emerald', 'bread', 'apple', 'carrot', 'potato', 'baked_potato'
]
const VILLAGE_CLUE_BLOCKS = [
  'grass_path', 'wheat', 'carrots', 'potatoes', 'beetroots',
  'white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed', 'yellow_bed',
  'lime_bed', 'pink_bed', 'gray_bed', 'light_gray_bed', 'cyan_bed',
  'purple_bed', 'blue_bed', 'brown_bed', 'green_bed', 'red_bed', 'black_bed'
]

const MOVE_TIMEOUT_MS = 6000
const DIG_TIMEOUT_MS = 5000
const CRAFT_TIMEOUT_MS = 12000
const STUCK_CHECK_INTERVAL = 3000
const STUCK_DISTANCE_THRESHOLD = 0.5
const STUCK_MAX_COUNT = 3
const BUSY_GUARD_TIMEOUT_MS = 30000
const DROP_PICKUP_RADIUS = 14
const CLIFF_DROP_SAFE = 3
const CLIFF_SCAN_DEPTH = 8
const SEARCH_ANALYZE_INTERVAL_MS = 2000

// в”Ђв”Ђв”Ђ KNOCKBACK SETTINGS (РќРћР’РћР•) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const KNOCKBACK_DURATION_MS = 280       // Р”Р°С‘Рј СЃРµСЂРІРµСЂРЅРѕР№ С„РёР·РёРєРµ РЅРѕСЂРјР°Р»СЊРЅРѕ РѕС‚С‹РіСЂР°С‚СЊ СѓРґР°СЂ
const KNOCKBACK_COOLDOWN_MS = 150       // РњРёРЅРёРјР°Р»СЊРЅС‹Р№ РёРЅС‚РµСЂРІР°Р» РјРµР¶РґСѓ knockback
const KNOCKBACK_STRENGTH = 1.2          // РЎРёР»Р° РѕС‚С‚Р°Р»РєРёРІР°РЅРёСЏ (РґР»СЏ СЂР°СЃС‡С‘С‚Р°)
const DAMAGE_REACTION_DELAY_MS = 80     // Р—Р°РґРµСЂР¶РєР° РїРµСЂРµРґ РїСЂРѕРґРѕР»Р¶РµРЅРёРµРј РґРµР№СЃС‚РІРёР№
const KNOCKBACK_JUMP_MS = 75            // РљРѕСЂРѕС‚РєРёР№ "РїРѕРґСЃРєРѕРє" РїСЂРё СѓРґР°СЂРµ, С‡С‚РѕР±С‹ РЅРµ Р·Р°РІРёСЃР°С‚СЊ РІ РІРѕР·РґСѓС…Рµ
const AIR_STUCK_RECOVERY_MS = 650       // Р•СЃР»Рё Р±РѕС‚ РІРёСЃРёС‚ РІ РІРѕР·РґСѓС…Рµ РґРѕР»СЊС€Рµ, Р·Р°РїСѓСЃРєР°РµРј recovery
const AIR_STUCK_VELOCITY_EPS = 0.03     // РџРѕСЂРѕРі "РїРѕС‡С‚Рё РЅРµ РґРІРёРіР°РµС‚СЃСЏ РїРѕ Y"
const KNOCKBACK_MIN_HANDS_OFF_MS = 120  // РљРѕСЂРѕС‚РєРѕРµ РѕРєРЅРѕ, РєРѕРіРґР° РјС‹ РІРѕРѕР±С‰Рµ РЅРµ Р»РµР·РµРј РІ С„РёР·РёРєСѓ СѓРґР°СЂР°
const KNOCKBACK_SETTLE_SPEED = 0.04     // РџРѕСЂРѕРі "СѓРґР°СЂ СѓР¶Рµ РѕС‚С‹РіСЂР°РЅ"
const INVALID_POSITION_RECOVERY_MS = 320
const AIR_RECOVERY_COOLDOWN_MS = 1400

// в”Ђв”Ђв”Ђ РќРђРЎРўР РћР™РљР Р•Р”Р« в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const FOOD_CRITICAL = 6
const FOOD_LOW = 12
const FOOD_OK = 16
const FOOD_ITEMS_MIN = 3
const LOW_HEALTH_FLEE_THRESHOLD = 10
const SAFE_COMBAT_HEALTH = 12

const OBJECTIVE_TIMEOUTS = {
  defend_hostile: 15000,
  eat_food: 8000,
  collect_drop: 12000,
  loot_chest: 20000,
  hunt_golem: 20000,
  gather_food: 40000,
  hunt_for_food: 30000,
  gather_wood: 45000,
  craft_table: 30000,
  craft_planks: 15000,
  craft_sticks: 15000,
  craft_wooden_pickaxe: 25000,
  craft_wooden_axe: 25000,
  mine_stone: 45000,
  craft_stone_pickaxe: 25000,
  craft_stone_axe: 25000,
  craft_furnace: 25000,
  mine_iron: 45000,
  go_village: 30000,
  flee: 8000,
  unstick: 10000,
  swim_to_shore: 15000,
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

// в”Ђв”Ђв”Ђ MEMORY в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
const memoryDir = path.join(__dirname, 'memory')
const memoryFile = path.join(memoryDir, `memory-${Date.now()}.jsonl`)
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true })

const settingsPath = path.join(__dirname, 'Settings.txt')
const DEFAULT_SETTINGS_TEXT = [
  '# Bot settings',
  '# Restart the bot after editing this file.',
  '# Launglage options: ru | en',
  'Launglage=ru',
  ''
].join('\n')

function normalizeBotLanguage(value = '') {
  const v = String(value || '').trim().toLowerCase()
  if (['ru', 'russian', 'russkiy', 'russkii', 'russian_language', 'russian lang', 'russian bot', '\u0440\u0443\u0441\u0441\u043a\u0438\u0439', '\u0440\u0443\u0441'].map((s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))).includes(v)) return 'ru'
  if (['en', 'english', 'eng', '\u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u0439'].map((s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))).includes(v)) return 'en'
  return 'ru'
}

function loadSettings() {
  try {
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, DEFAULT_SETTINGS_TEXT, 'utf8')
    }

    const raw = fs.readFileSync(settingsPath, 'utf8')
    const config = { language: 'ru' }

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const eq = trimmed.indexOf('=')
      const key = trimmed.slice(0, eq).trim().toLowerCase()
      const value = trimmed.slice(eq + 1).trim()
      if (key === 'launglage' || key === 'language') {
        config.language = normalizeBotLanguage(value)
      }
    }

    return config
  } catch {
    return { language: 'ru' }
  }
}

const botSettings = loadSettings()

const BOT_TEXT = {
  ru: {
    connected: ({ username, host, port, version }) => `\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d \u043a\u0430\u043a ${username} \u043a ${host}:${port} (v${version})`.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    status: ({ autoOn, stage, objective, hp, food, foodItems, swimming }) => `\u0410\u0432\u0442\u043e: ${autoOn ? '\u0412\u041a\u041b' : '\u0412\u042b\u041a\u041b'} | \u042d\u0440\u0430: ${stage} | \u0426\u0435\u043b\u044c: ${objective} | \u0425\u041f:${hp} \u0415\u0434\u0430:${food}/${foodItems}${swimming}`.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    commands: '\u041a\u043e\u043c\u0430\u043d\u0434\u044b: "leave", "inventory", "bot status", "bot auto on/off", "bot follow me", "bot stop", "bot memory".'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    intro: '\u0410\u0432\u0442\u043e-\u0440\u0435\u0436\u0438\u043c \u043f\u0440\u043e\u0434\u0432\u0438\u0433\u0430\u0435\u0442\u0441\u044f \u043f\u043e \u044d\u0440\u0430\u043c, \u0438\u0449\u0435\u0442 \u0446\u0435\u043b\u0438 \u0432\u043e\u043a\u0440\u0443\u0433, \u043d\u0435 \u0441\u0442\u043e\u0438\u0442 \u043d\u0430 \u043c\u0435\u0441\u0442\u0435 \u0438 \u0441\u0442\u0430\u0440\u0430\u0435\u0442\u0441\u044f \u043d\u0435 \u0437\u0430\u0441\u0442\u0440\u0435\u0432\u0430\u0442\u044c.'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    inventoryEmpty: '\u0418\u043d\u0432\u0435\u043d\u0442\u0430\u0440\u044c \u043f\u0443\u0441\u0442.'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    inventory: ({ preview, extra }) => `\u0418\u043d\u0432\u0435\u043d\u0442\u0430\u0440\u044c: ${preview}${extra}`.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    leavingNow: '\u0412\u044b\u0445\u043e\u0436\u0443.'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    stopped: '\u041e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d. \u0410\u0432\u0442\u043e-\u0440\u0435\u0436\u0438\u043c \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d.'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    autoOn: '\u0410\u0432\u0442\u043e-\u0440\u0435\u0436\u0438\u043c \u0432\u043a\u043b\u044e\u0447\u0435\u043d.'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    autoOff: '\u0410\u0432\u0442\u043e-\u0440\u0435\u0436\u0438\u043c \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d.'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    autoOffFirst: '\u0410\u0432\u0442\u043e-\u0440\u0435\u0436\u0438\u043c \u0441\u0435\u0439\u0447\u0430\u0441 \u0432\u043a\u043b\u044e\u0447\u0435\u043d. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0434\u0438: bot auto off'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    following: ({ username }) => `\u0425\u043e\u0440\u043e\u0448\u043e, \u0438\u0434\u0443 \u0437\u0430 ${username}`.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    memoryFile: ({ file }) => `\u0424\u0430\u0439\u043b \u043f\u0430\u043c\u044f\u0442\u0438: ${file}`.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    targetSearching: ({ target }) => `\u041d\u0435 \u0432\u0438\u0436\u0443 \u0446\u0435\u043b\u044c \u0440\u044f\u0434\u043e\u043c, \u0438\u0434\u0443 \u0438\u0441\u043a\u0430\u0442\u044c: ${target}.`.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    damaged: '\u0410\u0439!'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  },
  en: {
    connected: ({ username, host, port, version }) => `Connected as ${username} to ${host}:${port} (v${version})`,
    status: ({ autoOn, stage, objective, hp, food, foodItems, swimming }) =>
      `Auto: ${autoOn ? 'ON' : 'OFF'} | Era: ${stage} | Objective: ${objective} | HP:${hp} Food:${food}/${foodItems}${swimming}`,
    commands: 'Commands: "leave", "inventory", "bot status", "bot auto on/off", "bot follow me", "bot stop", "bot memory".',
    intro: 'Auto mode focuses on era progression, searches around for targets, keeps moving, and tries not to get stuck.',
    inventoryEmpty: 'Inventory is empty.',
    inventory: ({ preview, extra }) => `Inventory: ${preview}${extra}`,
    leavingNow: 'Leaving now.',
    stopped: 'Stopped. Auto mode is OFF.',
    autoOn: 'Auto mode is ON.',
    autoOff: 'Auto mode is OFF.',
    autoOffFirst: 'Auto is ON. Turn it off first: bot auto off',
    following: ({ username }) => `OK, following ${username}`,
    memoryFile: ({ file }) => `Memory file: ${file}`,
    targetSearching: ({ target }) => `I cannot see the target nearby, searching for ${target}.`,
    damaged: 'Ouch!'
  }
}

const STAGE_LABELS = {
  ru: {
    wood_age: '\u0434\u0435\u0440\u0435\u0432\u044f\u043d\u043d\u0430\u044f'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    stone_age: '\u043a\u0430\u043c\u0435\u043d\u043d\u0430\u044f'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    iron_age: '\u0436\u0435\u043b\u0435\u0437\u043d\u0430\u044f'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    diamond_age: '\u0430\u043b\u043c\u0430\u0437\u043d\u0430\u044f'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    nether_prep: '\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u043a \u041d\u0435\u0437\u0435\u0440\u0443'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    stronghold: '\u043f\u043e\u0438\u0441\u043a \u043a\u0440\u0435\u043f\u043e\u0441\u0442\u0438'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
    end_game: '\u042d\u043d\u0434'.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  },
  en: {
    wood_age: 'wood',
    stone_age: 'stone',
    iron_age: 'iron',
    diamond_age: 'diamond',
    nether_prep: 'nether prep',
    stronghold: 'stronghold',
    end_game: 'The End'
  }
}

function t(key, vars = {}) {
  const lang = botSettings.language === 'en' ? 'en' : 'ru'
  const table = BOT_TEXT[lang] || BOT_TEXT.ru
  const fallback = BOT_TEXT.en
  const value = table[key] || fallback[key] || key
  return typeof value === 'function' ? value(vars) : value
}

function stageLabel(stage) {
  const lang = botSettings.language === 'en' ? 'en' : 'ru'
  return (STAGE_LABELS[lang] && STAGE_LABELS[lang][stage]) || stage
}

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
  let interruptTimer = null
  const startInterruptNonce = actionInterruptNonce
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + ' timeout (' + ms + 'ms)')), ms)
      }),
      new Promise((_, reject) => {
        interruptTimer = setInterval(() => {
          if (startInterruptNonce !== actionInterruptNonce) {
            clearInterval(interruptTimer)
            reject(new Error(label + ' interrupted (' + (actionInterruptReason || 'manual') + ')'))
          }
        }, 25)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
    if (interruptTimer) clearInterval(interruptTimer)
  }
}

async function waitInterruptible(ms, startNonce = actionInterruptNonce) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (startNonce !== actionInterruptNonce) return false
    await waitMs(Math.min(50, Math.max(1, until - Date.now())))
  }
  return startNonce === actionInterruptNonce
}

function clearControlStatesHard() {
  try {
    if (typeof bot.clearControlStates === 'function') {
      bot.clearControlStates()
      return
    }
  } catch {}
  clearWanderControls()
}

function interruptCurrentActions(reason = 'interrupt') {
  actionInterruptNonce += 1
  actionInterruptReason = reason
  try {
    if (bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
      bot.pathfinder.stop()
    }
  } catch {}
  try { bot.pathfinder.setGoal(null) } catch {}
  pathTaskActive = false
  clearControlStatesHard()
  searchMotionUntil = 0
  saveMemory('action_interrupted', {
    reason,
    objective: currentObjective ? currentObjective.type : null,
    pos: getBestKnownPosition()
  })
}

function queuePostKnockbackResume() {
  if (postKnockbackResumeTimer) return
  postKnockbackResumeTimer = setTimeout(() => {
    postKnockbackResumeTimer = null
    if (isInKnockback()) return
    if (isPositionRecovering()) {
      clearWanderControls()
      queuePostKnockbackResume()
      return
    }

    if (damageReplanPending) {
      damageReplanPending = false
      autoProgressBusy = false
      autoProgressBusySince = 0
      forceStopEverything()
      if (currentObjective) {
        clearObjective('replaced', 'damage replan')
      }
      saveMemory('damage_replan_resume', {
        pos: getBestKnownPosition(),
        health: typeof bot.health === 'number' ? bot.health : null
      })
    }

    if (autoProgressBusy) {
      queuePostKnockbackResume()
      return
    }

    if (autoProgressEnabled) {
      runAutoProgress().catch((err) => {
        saveMemory('post_knockback_resume_error', { msg: err.message })
      })
      return
    }

    if (followTarget) {
      tryFollowPlayer()
    } else if (!isBotBusyWithPath()) {
      roamWorld().catch(() => {})
    }
  }, 120)
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
let objectiveSerial = 0
let lastHeadLookAt = 0
let clutchInProgress = false
let lastClutchAt = 0
let searchMotionUntil = 0
let lastSearchChatAt = 0
let lastSearchAnalyzeAt = 0
let searchAnalyzeBusy = false
let lastKnownHealth = 20
let lastDamageAt = 0
let damageRecoveryUntil = 0
let damageReplanPending = false
const villageRecords = new Map()
const lootedChestKeys = new Set()

// в”Ђв”Ђв”Ђ STUCK DETECTION в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
let lastPositions = []
let stuckCounter = 0
let lastStuckCheckAt = 0

// в”Ђв”Ђв”Ђ SWIMMING STATE в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
let isCurrentlySwimming = false
let swimStartedAt = 0
let lastSwimLog = 0

// в”Ђв”Ђв”Ђ KNOCKBACK STATE (РќРћР’РћР•) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
let knockbackUntil = 0
let knockbackDirection = null
let lastKnockbackAt = 0
let knockbackSourceId = null
let knockbackJumpUntil = 0
let damageHitCount = 0           // РЎС‡С‘С‚С‡РёРє СѓРґР°СЂРѕРІ РґР»СЏ СЂРµР°РєС†РёРё
let lastDamageReactionChat = 0
let actionInterruptNonce = 0
let actionInterruptReason = ''
let postKnockbackResumeTimer = null   // РљРѕРіРґР° РїРѕСЃР»РµРґРЅРёР№ СЂР°Р· РіРѕРІРѕСЂРёР»Рё "РђР№!"
let airStuckSince = 0
let invalidPositionSince = 0
let lastAirRecoveryAt = 0
let lastFinitePosition = null
let lastFinitePositionAt = 0
let invalidPositionHoldUntil = 0

function hasFiniteEntityPosition() {
  if (!bot.entity || !bot.entity.position) return false
  const pos = bot.entity.position
  return Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)
}

function resetAirStuckState() {
  airStuckSince = 0
  invalidPositionSince = 0
}

function rememberFinitePosition() {
  if (!hasFiniteEntityPosition()) return
  lastFinitePosition = bot.entity.position.clone()
  lastFinitePositionAt = Date.now()
}

function getBestKnownPosition() {
  if (hasFiniteEntityPosition()) return bot.entity.position.clone()
  if (lastFinitePosition) return lastFinitePosition.clone()
  return null
}

function isPositionRecovering() {
  return !hasFiniteEntityPosition() || Date.now() < invalidPositionHoldUntil
}

function triggerAirRecovery(reason, extra = {}) {
  const now = Date.now()
  if (now - lastAirRecoveryAt < AIR_RECOVERY_COOLDOWN_MS) return false
  lastAirRecoveryAt = now
  invalidPositionHoldUntil = Math.max(invalidPositionHoldUntil, now + 900)

  const snapshotPos = getBestKnownPosition()
  saveMemory('air_stuck_recovery', {
    reason,
    pos: snapshotPos,
    objective: currentObjective ? currentObjective.type : null,
    ...extra
  })

  damageReplanPending = false
  interruptCurrentActions('air_stuck_recovery')
  clearControlStatesHard()
  knockbackUntil = 0
  knockbackJumpUntil = 0
  knockbackDirection = null
  knockbackSourceId = null
  damageRecoveryUntil = now + 250
  airStuckSince = 0
  invalidPositionSince = 0

  if (hasFiniteEntityPosition() && autoProgressEnabled) {
    if (!currentObjective || currentObjective.type !== 'unstick') {
      if (currentObjective) clearObjective('replaced', `air recovery: ${reason}`)
      setObjective('unstick', { reason })
    }
    return true
  }

  queuePostKnockbackResume()
  return true
}

function airStuckRecoveryTick() {
  if (!bot.entity) return false

  if (hasFiniteEntityPosition()) {
    rememberFinitePosition()
    invalidPositionSince = 0
  }

  if (!hasFiniteEntityPosition()) {
    if (!invalidPositionSince) invalidPositionSince = Date.now()
    if (Date.now() - invalidPositionSince >= INVALID_POSITION_RECOVERY_MS) {
      return triggerAirRecovery('invalid_position', {
        lastFinitePos: lastFinitePosition,
        lastFiniteAgeMs: lastFinitePositionAt ? Date.now() - lastFinitePositionAt : null
      })
    }
    return false
  }

  if (isInWater() || isCurrentlySwimming || isInKnockback() || Date.now() < damageRecoveryUntil) {
    resetAirStuckState()
    return false
  }

  const velY = bot.entity.velocity && Number.isFinite(bot.entity.velocity.y) ? bot.entity.velocity.y : 0
  if (bot.entity.onGround || Math.abs(velY) > AIR_STUCK_VELOCITY_EPS) {
    resetAirStuckState()
    return false
  }

  if (!airStuckSince) {
    airStuckSince = Date.now()
    return false
  }

  if (Date.now() - airStuckSince < AIR_STUCK_RECOVERY_MS) return false
  return triggerAirRecovery('hover_after_damage', {
    velocityY: velY
  })
}

function checkStuck() {
  if (!bot.entity) return false
  if (!hasFiniteEntityPosition()) return false
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
  const interruptNonce = actionInterruptNonce
  saveMemory('unstick_start', { pos: getBestKnownPosition() })
  forceStopEverything()

  const settled = await waitInterruptible(300, interruptNonce)
  if (!settled) return

  const baseYaw = Number.isFinite(bot.entity && bot.entity.yaw) ? bot.entity.yaw : 0
  const randomYaw = baseYaw + Math.PI + (Math.random() - 0.5) * 1.5
  try { await bot.look(randomYaw, 0, true) } catch {}
  const turned = await waitInterruptible(200, interruptNonce)
  if (!turned) return

  bot.setControlState('back', true)
  bot.setControlState('jump', true)
  const backed = await waitInterruptible(600, interruptNonce)
  clearWanderControls()
  if (!backed) return

  const paused = await waitInterruptible(200, interruptNonce)
  if (!paused) return

  bot.setControlState('forward', true)
  bot.setControlState('jump', true)
  const pushed = await waitInterruptible(800, interruptNonce)

  clearWanderControls()
  if (!pushed) return

  if (bot.entity.isInWater) {
    bot.setControlState('jump', true)
    bot.setControlState('forward', true)
    const swam = await waitInterruptible(1500, interruptNonce)
    clearWanderControls()
    if (!swam) return
  }

  saveMemory('unstick_done', { pos: getBestKnownPosition() })
}

function forceStopEverything() {
  try {
    if (bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
      bot.pathfinder.stop()
    }
  } catch {}
  try { bot.pathfinder.setGoal(null) } catch {}
  pathTaskActive = false
  clearControlStatesHard()
  searchMotionUntil = 0
  // ?? ?????????? knockback ? ?? ?????? ??????????
}

// ??? KNOCKBACK SYSTEM (?????) ???????????????????????????????????

// ????? ????????? ????????, ??????? ????? ??????? ????
function findDamageSource(maxDistance = 6) {
  if (!bot.entity) return null
  
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity
    
    for (const e of entities) {
      if (!e || !e.position || e.id === bot.entity.id) continue
      
      // Р’СЂР°Р¶РґРµР±РЅС‹Рµ РјРѕР±С‹
      if (e.type === 'mob' && HOSTILE_MOBS.includes(e.name)) {
        const d = bot.entity.position.distanceTo(e.position)
        if (d < maxDistance && d < bestDist) {
          best = e
          bestDist = d
        }
        continue
      }
      
      // РРіСЂРѕРєРё (PvP)
      if (e.type === 'player' && e.username !== bot.username) {
        const d = bot.entity.position.distanceTo(e.position)
        if (d < maxDistance && d < bestDist) {
          best = e
          bestDist = d
        }
      }
    }
    
    return best
  } catch {
    return null
  }
}

// РџСЂРёРјРµРЅРёС‚СЊ knockback СЌС„С„РµРєС‚ вЂ” Р‘Р•Р— РѕСЃС‚Р°РЅРѕРІРєРё РґСЂСѓРіРёС… РґРµР№СЃС‚РІРёР№
function applyKnockback(sourceEntity = null) {
  if (!bot.entity) return

  const now = Date.now()
  const comboHit = isInKnockback() || (now - lastKnockbackAt < KNOCKBACK_COOLDOWN_MS)

  if (comboHit && knockbackDirection && knockbackDirection.mode === 'jump_recovery') {
    lastKnockbackAt = now
    knockbackUntil = Math.max(knockbackUntil, now + KNOCKBACK_DURATION_MS)
    damageRecoveryUntil = knockbackUntil + DAMAGE_REACTION_DELAY_MS
    knockbackSourceId = sourceEntity && sourceEntity.id ? sourceEntity.id : knockbackSourceId
    knockbackDirection.comboHits = (knockbackDirection.comboHits || 1) + 1
    if (bot.entity.onGround) {
      knockbackJumpUntil = Math.max(knockbackJumpUntil, now + KNOCKBACK_JUMP_MS)
    }
    saveMemory('knockback_extended', {
      mode: 'jump_recovery',
      comboHits: knockbackDirection.comboHits,
      source: sourceEntity ? sourceEntity.name : 'unknown',
      health: bot.health
    })
    return
  }

  lastKnockbackAt = now
  knockbackUntil = now + KNOCKBACK_DURATION_MS
  knockbackJumpUntil = 0
  damageRecoveryUntil = knockbackUntil + DAMAGE_REACTION_DELAY_MS

  try {
    if (bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
      bot.pathfinder.stop()
    }
  } catch {}
  try { bot.pathfinder.setGoal(null) } catch {}
  pathTaskActive = false
  clearControlStatesHard()

  knockbackSourceId = sourceEntity && sourceEntity.id ? sourceEntity.id : null
  knockbackDirection = {
    mode: 'jump_recovery',
    startedAt: now,
    comboHits: 1
  }
  knockbackJumpUntil = bot.entity.onGround ? now + KNOCKBACK_JUMP_MS : now

  // Практически стабильнее для mineflayer 1.13: короткий jump-пульс
  // без ручного back/forward и без долгого hands-off окна.

  saveMemory('knockback_applied', {
    mode: 'jump_recovery',
    source: sourceEntity ? sourceEntity.name : 'unknown',
    sourcePos: sourceEntity?.position,
    health: bot.health
  })
}

function knockbackTick() {
  const now = Date.now()

  if (now < knockbackUntil && knockbackDirection) {
    try {
      if (bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
        bot.pathfinder.stop()
      }
    } catch {}
    try { bot.pathfinder.setGoal(null) } catch {}
    pathTaskActive = false

    clearControlStatesHard()

    if (hasFiniteEntityPosition() && bot.entity.onGround && now < knockbackJumpUntil) {
      bot.setControlState('jump', true)
    }

    return true
  }

  if (knockbackDirection) {
    clearControlStatesHard()
    knockbackJumpUntil = 0
    knockbackDirection = null
    knockbackSourceId = null
    queuePostKnockbackResume()
  }

  return false
}

function isInKnockback() {
  return Date.now() < knockbackUntil && knockbackDirection !== null
}

// в”Ђв”Ђв”Ђ SWIMMING SYSTEM в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

function findNearestShore(maxDistance = 20) {
  if (!bot.entity) return null
  
  const pos = bot.entity.position
  let bestPos = null
  let bestDist = Infinity

  for (let dx = -maxDistance; dx <= maxDistance; dx += 2) {
    for (let dz = -maxDistance; dz <= maxDistance; dz += 2) {
      try {
        const checkPos = pos.offset(dx, 0, dz).floored()
        
        for (let dy = -3; dy <= 3; dy++) {
          const groundPos = checkPos.offset(0, dy, 0)
          const ground = bot.blockAt(groundPos)
          const above = bot.blockAt(groundPos.offset(0, 1, 0))
          const above2 = bot.blockAt(groundPos.offset(0, 2, 0))

          if (!ground || !above || !above2) continue

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
              bestPos = groundPos.offset(0, 1, 0)
            }
          }
        }
      } catch {}
    }
  }

  return bestPos
}

async function swimToShore() {
  const shore = findNearestShore(25)
  
  if (!shore) {
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
    
    const diff = shore.minus(bot.entity.position)
    const yaw = Math.atan2(-diff.x, -diff.z)
    bot.look(yaw, -0.2, true)

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
      
      const newDiff = shore.minus(bot.entity.position)
      const newYaw = Math.atan2(-newDiff.x, -newDiff.z)
      bot.look(newYaw, -0.2, true)
      
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

function swimTick() {
  if (!bot.entity) return
  
  const inWater = isInWater()
  const submerged = isSubmerged()

  if (inWater) {
    bot.setControlState('jump', true)
    
    if (!isCurrentlySwimming) {
      isCurrentlySwimming = true
      swimStartedAt = Date.now()
      saveMemory('swim_start', { pos: bot.entity.position })
    }

    if (submerged) {
      bot.setControlState('sprint', true)
    }

    const now = Date.now()
    if (now - lastSwimLog > 5000) {
      saveMemory('swimming', { 
        pos: bot.entity.position, 
        duration: now - swimStartedAt,
        submerged 
      })
      lastSwimLog = now
    }

    if (now - swimStartedAt > 10000 && autoProgressEnabled) {
      if (!currentObjective || currentObjective.type !== 'swim_to_shore') {
        say('Swimming too long вЂ” looking for shore')
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

// в”Ђв”Ђв”Ђ SAFE GOTO в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

// в”Ђв”Ђв”Ђ OBJECTIVE MANAGEMENT в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function setObjective(type, data = {}) {
  if (currentObjective) {
    clearObjective('replaced', `replaced by ${type}`)
  }

  const timeout = OBJECTIVE_TIMEOUTS[type] || 30000

  currentObjective = {
    id: ++objectiveSerial,
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
    Date.now() - currentObjective.startedAt > 12000
}

// в”Ђв”Ђв”Ђ INVENTORY HELPERS в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

function getCombatWeaponItem() {
  return itemByNames([...WEAPON_NAMES, ...AXE_NAMES])
}

function getSwordWeaponItem() {
  return itemByNames(WEAPON_NAMES)
}

function hasCombatWeapon() {
  return !!getCombatWeaponItem()
}

function hasSwordWeapon() {
  return !!getSwordWeaponItem()
}

function foodCount() {
  return anyItemCount(FOOD_ITEM_NAMES)
}

function hasWaterBucket() {
  return itemCount('water_bucket') > 0
}

function shouldCollectDroppedItem(item) {
  if (!item || !item.name) return false

  const name = item.name
  if (LOG_NAMES.includes(name) || PLANK_NAMES.includes(name)) return true
  if (FOOD_ITEM_NAMES.includes(name) || DROP_ALWAYS_USEFUL.includes(name)) return true
  if (PICKAXE_NAMES.includes(name) || AXE_NAMES.includes(name) || WEAPON_NAMES.includes(name)) return true

  if (currentStage === 'wood_age' && ['cobblestone'].includes(name)) return true
  if (currentStage !== 'wood_age' && ['cobblestone', 'iron_ore', 'iron_ingot', 'coal'].includes(name)) return true

  return false
}

function findUsefulDroppedItem(maxDistance = DROP_PICKUP_RADIUS) {
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity

    for (const entity of entities) {
      if (!entity || entity.type !== 'object' || !entity.position) continue
      const dropped = typeof entity.getDroppedItem === 'function' ? entity.getDroppedItem() : null
      if (!shouldCollectDroppedItem(dropped)) continue
      const dist = bot.entity.position.distanceTo(entity.position)
      if (dist < maxDistance && dist < bestDist) {
        best = entity
        bestDist = dist
      }
    }

    return best
  } catch {
    return null
  }
}

function findNearestBlockByNames(blockNames, maxDistance = 18) {
  if (!mcData || !Array.isArray(blockNames) || blockNames.length === 0) return null

  try {
    const ids = blockNames
      .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
      .filter((id) => id !== null)
    if (ids.length === 0) return null
    return bot.findBlock({ matching: ids, maxDistance })
  } catch {
    return null
  }
}

// в”Ђв”Ђв”Ђ FOOD LOGIC в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function getFoodLevel() {
  return typeof bot.food === 'number' ? bot.food : 20
}

function needsToEat() {
  return getFoodLevel() < FOOD_LOW && foodCount() > 0
}

function needsToHuntForFood() {
  const food = foodCount()
  const hunger = getFoodLevel()
  
  if (food >= FOOD_ITEMS_MIN) return false
  if (food === 0 && hunger < FOOD_OK) return true
  if (hunger < FOOD_CRITICAL) return true
  
  return false
}

function shouldPrioritizeFood() {
  return needsToEat() || needsToHuntForFood()
}

// в”Ђв”Ђв”Ђ ENTITY HELPERS в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

function isEntityVisible(entity, maxDistance = 14) {
  if (!bot.entity || !entity || !entity.position) return false

  try {
    const dist = bot.entity.position.distanceTo(entity.position)
    if (dist > maxDistance) return false
    if (Math.abs(entity.position.y - bot.entity.position.y) > 5) return false
    if (typeof bot.canSeeEntity === 'function') {
      return bot.canSeeEntity(entity)
    }
    return true
  } catch {
    return false
  }
}

function nearestVisibleHostile(maxDistance = 14) {
  try {
    const entities = Object.values(bot.entities || {})
    let best = null
    let bestDist = Infinity

    for (const e of entities) {
      if (!isHostileEntity(e) || !isEntityVisible(e, maxDistance)) continue
      const d = bot.entity.position.distanceTo(e.position)
      if (d < bestDist) {
        best = e
        bestDist = d
      }
    }

    return best
  } catch { return null }
}

function getExclusiveHostileObjective(maxDistance = 14) {
  const hostile = nearestVisibleHostile(maxDistance)
  if (!hostile) return null

  const armed = hasSwordWeapon()
  const careful = hostile.name === 'creeper'
  const shouldFlee = !armed || bot.health < LOW_HEALTH_FLEE_THRESHOLD

  return {
    type: shouldFlee ? 'flee' : 'defend_hostile',
    mobId: hostile.id,
    mobName: hostile.name,
    exclusive: true,
    careful,
    armed,
    source: 'visible_hostile'
  }
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

function getObjectiveLookPoint() {
  if (!bot.entity) return null
  if (!currentObjective) return null

  try {
    if (currentObjective.data && currentObjective.data.mobId) {
      const mob = entityById(currentObjective.data.mobId)
      if (mob && mob.position) return mob.position.offset(0, mob.height || 1.2, 0)
    }
    if (currentObjective.data && currentObjective.data.dropId) {
      const drop = entityById(currentObjective.data.dropId)
      if (drop && drop.position) return drop.position.offset(0, 0.2, 0)
    }
  } catch {}

  return null
}

function headLookTick() {
  if (!bot.entity || !autoProgressEnabled || !hasFiniteEntityPosition()) return
  // РќРµ РјРµРЅСЏРµРј РІР·РіР»СЏРґ РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return

  const now = Date.now()
  if (now - lastHeadLookAt < 850) return
  lastHeadLookAt = now

  try {
    const target = getObjectiveLookPoint()
    if (target) {
      bot.lookAt(target, true).catch(() => {})
      return
    }

    const moving = bot.getControlState('forward') || isBotBusyWithPath()
    if (!moving) return

    const yaw = bot.entity.yaw + ((Math.random() * 2 - 1) * 0.22)
    const pitch = Math.max(-0.45, Math.min(0.25, bot.entity.pitch + ((Math.random() * 2 - 1) * 0.12)))
    bot.look(yaw, pitch, true).catch(() => {})
  } catch {}
}

// в”Ђв”Ђв”Ђ COMBAT в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function attackEntityUntilGone(entityId, maxMs, memoryType) {
  const deadline = Date.now() + maxMs
  let hits = 0

  while (Date.now() < deadline) {
    const interruptNonce = actionInterruptNonce

    // Р’ РІРѕРґРµ вЂ” РґРµСЂР¶РёРјСЃСЏ РЅР° РїР»Р°РІСѓ
    if (isInWater()) {
      bot.setControlState('jump', true)
    }

    // Р’Рѕ РІСЂРµРјСЏ knockback вЂ” Р¶РґС‘Рј Р·Р°РІРµСЂС€РµРЅРёСЏ, РЅРѕ РЅРµ РІС‹С…РѕРґРёРј РёР· Р±РѕСЏ
    if (isInKnockback()) {
      await waitMs(50)
      continue
    }

    if (bot.health < LOW_HEALTH_FLEE_THRESHOLD) {
      saveMemory('flee_low_health', { health: bot.health })
      await fleeFromEntity(entityId)
      return false
    }

    const mob = entityById(entityId)
    if (!mob || !mob.isValid) return true

    try {
      const weapon = memoryType === 'defense_attack'
        ? getSwordWeaponItem()
        : getCombatWeaponItem()
      if (!weapon) {
        saveMemory(`${memoryType}_no_weapon`, { mob: mob.name, pos: mob.position })
        await fleeFromEntity(entityId)
        return false
      }

      try { await bot.equip(weapon, 'hand') } catch {}

      const isCreeper = mob.name === 'creeper'
      const distance = mob.position ? bot.entity.position.distanceTo(mob.position) : Infinity

      if (isCreeper && distance < 2.6) {
        saveMemory('creeper_too_close', { pos: mob.position, distance })
        await fleeFromEntity(entityId)
        await waitMs(250)
        continue
      }

      const attackRange = isCreeper ? 3 : 2
      await gotoNearWithTimeout(mob.position, attackRange, isCreeper ? 2400 : 3000)

      if (mob.position) {
        bot.lookAt(mob.position.offset(0, 1.2, 0), true)
      }

      bot.attack(mob)
      hits++
      objectiveProgress({ action: 'attack', mob: mob.name, hits, careful: isCreeper })
      saveMemory(memoryType, { mob: mob.name, pos: mob.position, careful: isCreeper })

      if (isCreeper) {
        try { bot.pathfinder.setGoal(null) } catch {}
        pathTaskActive = false
        bot.setControlState('back', true)
        bot.setControlState('jump', true)
        const backedOff = await waitInterruptible(650, interruptNonce)
        if (!backedOff) continue
        clearWanderControls()
        const regrouped = await waitInterruptible(280, interruptNonce)
        if (!regrouped) continue
        continue
      }
    } catch (err) {
      saveMemory(`${memoryType}_fail`, { msg: err.message })
    }
    const waited = await waitInterruptible(420, interruptNonce)
    if (!waited) continue
  }

  const left = entityById(entityId)
  if (!left || !left.isValid) {
    await waitMs(500)
    const nearbyDrop = findUsefulDroppedItem(6)
    if (nearbyDrop) {
      await collectDroppedItem(nearbyDrop.id)
    }
    return true
  }
  return false
}

async function fleeFromEntity(entityId) {
  const interruptNonce = actionInterruptNonce

  // РќР• РѕСЃС‚Р°РЅР°РІР»РёРІР°РµРј РІСЃС‘ вЂ” РїСЂРѕСЃС‚Рѕ РјРµРЅСЏРµРј РЅР°РїСЂР°РІР»РµРЅРёРµ
  try { bot.pathfinder.setGoal(null) } catch {}
  pathTaskActive = false

  const mob = entityById(entityId)
  if (!mob || !mob.position) {
    bot.setControlState('back', true)
    bot.setControlState('sprint', true)
    bot.setControlState('jump', true)
    const escapedBlind = await waitInterruptible(2000, interruptNonce)
    if (!escapedBlind) return false
    clearWanderControls()
    return true
  }

  const diff = bot.entity.position.minus(mob.position)
  const yaw = Math.atan2(-diff.x, -diff.z) + Math.PI
  bot.look(yaw, 0, true)
  const turned = await waitInterruptible(100, interruptNonce)
  if (!turned) return false

  bot.setControlState('forward', true)
  bot.setControlState('sprint', true)
  bot.setControlState('jump', true)
  const escaped = await waitInterruptible(3000, interruptNonce)
  if (!escaped) return false
  clearWanderControls()

  saveMemory('flee_done', { pos: bot.entity.position })
  return true
}

// в”Ђв”Ђв”Ђ BLOCK FINDING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function posKey(pos) {
  if (!pos) return ''
  return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`
}

function villageKeyFromPos(pos) {
  if (!pos) return ''
  return `${Math.floor(pos.x / 64)},${Math.floor(pos.z / 64)}`
}

function getVillageAnchor(maxDistance = 64) {
  const villager = nearestVillager(maxDistance)
  if (villager) return villager.position
  const clue = findVillageClueBlock(maxDistance)
  if (clue) return clue.position
  return null
}

function getVillageInfo(maxDistance = 64) {
  const anchor = getVillageAnchor(maxDistance)
  if (!anchor) return null
  const key = villageKeyFromPos(anchor)
  const record = villageRecords.get(key) || { status: 'new', misses: 0, chestsLooted: 0, lastSeenAt: 0, reason: '' }
  return { key, anchor, record }
}

function setVillageState(key, patch = {}) {
  if (!key) return null
  const prev = villageRecords.get(key) || { status: 'new', misses: 0, chestsLooted: 0, lastSeenAt: 0, reason: '' }
  const next = { ...prev, ...patch, updatedAt: Date.now() }
  villageRecords.set(key, next)
  saveMemory('village_state', { key, ...next })
  return next
}

function markVillageExhausted(key, reason = 'empty') {
  if (!key) return
  const prev = villageRecords.get(key) || { status: 'new', misses: 0, chestsLooted: 0 }
  const status = prev.chestsLooted > 0 ? 'looted' : 'empty'
  setVillageState(key, {
    status,
    reason,
    misses: (prev.misses || 0) + 1
  })
}

function isVillageWorthSearching(maxDistance = 64) {
  const info = getVillageInfo(maxDistance)
  if (!info) return false
  return !['empty', 'looted'].includes(info.record.status)
}

function findNearestChest(maxDistance = 32, includeVisited = false) {
  if (!mcData) return null
  try {
    const ids = CHEST_BLOCK_NAMES
      .map((name) => (mcData.blocksByName[name] ? mcData.blocksByName[name].id : null))
      .filter((id) => id !== null)
    if (ids.length === 0) return null
    const positions = typeof bot.findBlocks === 'function'
      ? bot.findBlocks({ matching: ids, maxDistance, count: 32 })
      : []

    const candidates = positions.length > 0
      ? positions.map((pos) => bot.blockAt(pos)).filter(Boolean)
      : [bot.findBlock({ matching: ids, maxDistance })].filter(Boolean)

    const usable = candidates
      .filter((block) => includeVisited || !lootedChestKeys.has(posKey(block.position)))
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))

    return usable[0] || null
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

async function collectDroppedItem(dropId) {
  const deadline = Date.now() + 9000

  while (Date.now() < deadline) {
    // Р’Рѕ РІСЂРµРјСЏ knockback вЂ” РїСЂРѕСЃС‚Рѕ Р¶РґС‘Рј
    if (isInKnockback()) {
      await waitMs(50)
      continue
    }
    
    const drop = entityById(dropId)
    if (!drop || !drop.isValid) return true

    try {
      await gotoNearWithTimeout(drop.position, 1, 2500)
      objectiveProgress({ action: 'collect_drop' })
    } catch {}

    await waitMs(350)

    const stillThere = entityById(dropId)
    if (!stillThere || !stillThere.isValid) {
      saveMemory('drop_collected', { dropId })
      return true
    }
  }

  return false
}

function markSearchMotion(durationMs = 2400) {
  searchMotionUntil = Math.max(searchMotionUntil, Date.now() + durationMs)
}

function detectNearbyTargetForObjective() {
  if (!currentObjective) return null

  const type = currentObjective.type

  if (type === 'gather_wood' || type === 'craft_planks' || type === 'craft_table' || type === 'craft_wooden_pickaxe' || type === 'craft_wooden_axe') {
    const log = findNearestBlockByNames(LOG_NAMES, 14)
    if (log) return { kind: 'block', name: log.name, pos: log.position }
  }

  if (type === 'mine_stone' || type === 'craft_stone_pickaxe' || type === 'craft_stone_axe') {
    const stone = findNearestBlockByNames(['stone', 'cobblestone'], 12)
    if (stone) return { kind: 'block', name: stone.name, pos: stone.position }
  }

  if (type === 'mine_iron') {
    const iron = findNearestBlockByNames(['iron_ore'], 16)
    if (iron) return { kind: 'block', name: iron.name, pos: iron.position }
  }

  if (type === 'hunt_for_food') {
    const crop = findNearestBlockByNames(FOOD_CROP_BLOCKS, 14)
    if (crop) return { kind: 'block', name: crop.name, pos: crop.position }
    const mob = nearestPassiveFoodMob(16)
    if (mob) return { kind: 'mob', name: mob.name, pos: mob.position }
  }

  if (type === 'go_village' || type === 'loot_chest') {
    const chest = findNearestChest(20, false)
    if (chest) return { kind: 'block', name: chest.name, pos: chest.position }
    const villager = nearestVillager(22)
    if (villager) return { kind: 'mob', name: villager.name, pos: villager.position }
    const clue = findVillageClueBlock(22)
    if (clue) return { kind: 'block', name: clue.name, pos: clue.position }
  }

  if (type === 'defend_hostile' || type === 'flee') {
    const hostile = nearestHostile(14)
    if (hostile) return { kind: 'mob', name: hostile.name, pos: hostile.position }
  }

  return null
}

async function analyzeSearchArea() {
  if (!bot.entity || !currentObjective || searchAnalyzeBusy || !hasFiniteEntityPosition()) return false
  // РќРµ Р°РЅР°Р»РёР·РёСЂСѓРµРј РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return false

  searchAnalyzeBusy = true
  lastSearchAnalyzeAt = Date.now()

  try {
    clearWanderControls()
    saveMemory('search_analyze', { objective: currentObjective.type, pos: bot.entity.position })

    const baseYaw = bot.entity.yaw
    const yawOffsets = [0, -0.85, 0.85, -1.7, 1.7]

    for (const offset of yawOffsets) {
      try { await bot.look(baseYaw + offset, Math.max(-0.25, Math.min(0.2, bot.entity.pitch)), true) } catch {}
      await waitMs(120)

      const found = detectNearbyTargetForObjective()
      if (found) {
        searchMotionUntil = 0
        objectiveProgress({ action: 'search_found', found: found.name })
        saveMemory('search_target_found', {
          objective: currentObjective.type,
          found: found.name,
          kind: found.kind,
          pos: found.pos
        })
        return true
      }
    }

    saveMemory('search_target_miss', { objective: currentObjective.type, pos: bot.entity.position })
    return false
  } finally {
    searchAnalyzeBusy = false
  }
}

async function searchForTarget(targetName = 'target') {
  if (!bot.entity || !hasFiniteEntityPosition()) return false
  // РќРµ РёС‰РµРј РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return false

  markSearchMotion(2600)
  objectiveProgress({ action: 'search', target: targetName })

  const now = Date.now()
  if (now - lastSearchChatAt > 12000) {
    try { bot.chat(t('targetSearching', { target: targetName })) } catch {}
    lastSearchChatAt = now
  }

  const yawShift = (Math.random() * 1.6) - 0.8
  const pitch = Math.max(-0.35, Math.min(0.35, bot.entity.pitch + ((Math.random() * 0.3) - 0.15)))
  try { await bot.look(bot.entity.yaw + yawShift, pitch, true) } catch {}

  const scan = scanForwardTerrain()
  if (scan && shouldJumpForward(scan)) {
    bot.setControlState('jump', true)
  }

  await roamWorld()
  await waitMs(350)
  return true
}

function scanForwardTerrain(dist = 1.35) {
  if (!bot.entity) return null
  if (!hasFiniteEntityPosition()) return null

  try {
    const yaw = Number.isFinite(bot.entity.yaw) ? bot.entity.yaw : 0
    const dx = -Math.sin(yaw) * dist
    const dz = -Math.cos(yaw) * dist
    const baseY = Math.floor(bot.entity.position.y)
    const frontX = Math.floor(bot.entity.position.x + dx)
    const frontZ = Math.floor(bot.entity.position.z + dz)

    const footPos = new Vec3(frontX, baseY, frontZ)
    const footBlock = bot.blockAt(footPos)
    const headBlock = bot.blockAt(footPos.offset(0, 1, 0))
    const groundBlock = bot.blockAt(footPos.offset(0, -1, 0))

    let dropDepth = 0
    if (!groundBlock || groundBlock.boundingBox !== 'block') {
      for (let d = 1; d <= CLIFF_SCAN_DEPTH; d++) {
        const probe = bot.blockAt(footPos.offset(0, -d, 0))
        if (probe && probe.boundingBox === 'block') {
          dropDepth = d
          break
        }
      }
    }

    return { footBlock, headBlock, groundBlock, dropDepth }
  } catch {
    return null
  }
}

function shouldTurnAwayFromTerrain(scan) {
  if (!scan) return false

  const footSolid = scan.footBlock && scan.footBlock.boundingBox === 'block'
  const headSolid = scan.headBlock && scan.headBlock.boundingBox === 'block'

  if (footSolid && headSolid) return true
  if (scan.dropDepth > CLIFF_DROP_SAFE && !hasWaterBucket()) return true
  return false
}

function shouldJumpForward(scan) {
  if (!scan) return false
  const footSolid = scan.footBlock && scan.footBlock.boundingBox === 'block'
  const headSolid = scan.headBlock && scan.headBlock.boundingBox === 'block'
  return Boolean(footSolid && !headSolid)
}

function findSolidBlockBelow(maxDepth = 8) {
  if (!bot.entity) return null

  try {
    const feet = bot.entity.position.floored()
    for (let d = 2; d <= maxDepth; d++) {
      const block = bot.blockAt(feet.offset(0, -d, 0))
      if (block && block.boundingBox === 'block' && block.name !== 'water' && block.name !== 'flowing_water') {
        return block
      }
    }
  } catch {}

  return null
}

async function attemptWaterBucketClutch() {
  if (clutchInProgress) return false
  if (!hasWaterBucket() || !bot.entity || bot.entity.onGround || isInWater()) return false
  if (Date.now() - lastClutchAt < 3000) return false

  const fallingFast = bot.entity.velocity && bot.entity.velocity.y < -0.65
  if (!fallingFast) return false

  const groundBlock = findSolidBlockBelow(8)
  if (!groundBlock) return false

  clutchInProgress = true
  lastClutchAt = Date.now()

  try {
    const bucket = itemByNames(['water_bucket'])
    if (!bucket) return false
    await bot.equip(bucket, 'hand')
    await bot.activateBlock(groundBlock, new Vec3(0, 1, 0), new Vec3(0.5, 1, 0.5))
    saveMemory('water_bucket_clutch', { ground: groundBlock.position, velocityY: bot.entity.velocity.y })
    return true
  } catch (err) {
    saveMemory('water_bucket_clutch_fail', { msg: err.message })
    return false
  } finally {
    setTimeout(() => { clutchInProgress = false }, 1200)
  }
}

// в”Ђв”Ђв”Ђ FOOD ACTIONS в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function maybeEatFood() {
  if (getFoodLevel() >= FOOD_OK) return false
  // РќРµ РµРґРёРј РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return false

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

async function huntForFood() {
  // РќРµ РѕС…РѕС‚РёРјСЃСЏ РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return false
  
  const cropMined = await mineNearestBlock(FOOD_CROP_BLOCKS, 24)
  if (cropMined) {
    objectiveProgress({ action: 'harvested_crop' })
    return true
  }

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

// в”Ђв”Ђв”Ђ TOOL EQUIPPING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

// в”Ђв”Ђв”Ђ CHEST LOOTING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function lootNearbyVillageChest() {
  if (!isLikelyVillageNearby()) return false
  // РќРµ Р»СѓС‚Р°РµРј РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return false

  const village = getVillageInfo(64)
  if (village) {
    setVillageState(village.key, { lastSeenAt: Date.now() })
    if (['empty', 'looted'].includes(village.record.status)) return false
  }

  const chestBlock = findNearestChest(36, false)
  if (!chestBlock) {
    if (village) markVillageExhausted(village.key, 'no unlooted chests found')
    return false
  }

  const chestKey = posKey(chestBlock.position)

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
    lootedChestKeys.add(chestKey)
    if (moved > 0) {
      if (village) {
        setVillageState(village.key, {
          status: 'active',
          chestsLooted: (village.record.chestsLooted || 0) + 1,
          lastChestPos: chestBlock.position,
          reason: 'chest looted'
        })
      }
      saveMemory('chest_loot', { pos: chestBlock.position, stacks: moved })
      return true
    }
    if (village) markVillageExhausted(village.key, 'empty chest')
    return false
  } catch (err) {
    saveMemory('chest_loot_fail', { msg: err.message })
    return false
  }
}

async function huntIronGolem() {
  if (bot.health < 14) return false
  if (isInKnockback()) return false
  
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

  if (bot.health < LOW_HEALTH_FLEE_THRESHOLD) {
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
  if (isInKnockback()) return false
  
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

// в”Ђв”Ђв”Ђ WANDERING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function roamWorld() {
  if (!bot.entity || !hasFiniteEntityPosition()) {
    clearWanderControls()
    return false
  }
  const now = Date.now()
  if (isBotBusyWithPath()) return false
  // Р’Рѕ РІСЂРµРјСЏ knockback вЂ” РЅРµ РІРјРµС€РёРІР°РµРјСЃСЏ РІ РґРІРёР¶РµРЅРёРµ
  if (isInKnockback()) return false

  if (isInWater()) {
    bot.setControlState('jump', true)
  }

  if (now >= wanderNextTurnAt) {
    const yaw = bot.entity.yaw + ((Math.random() * 2 - 1) * 1.6)
    const pitch = Math.max(-0.4, Math.min(0.35, bot.entity.pitch + ((Math.random() * 2 - 1) * 0.2)))
    bot.look(yaw, pitch, true)
    wanderNextTurnAt = now + 3000 + Math.floor(Math.random() * 4000)
  }

  const scan = scanForwardTerrain()
  const ahead = getBlockAhead()
  if ((ahead && shouldAvoidBlock(ahead)) || shouldTurnAwayFromTerrain(scan)) {
    bot.look(bot.entity.yaw + Math.PI * (0.5 + Math.random()), 0, true)
    wanderNextTurnAt = now + 2000
    saveMemory('wander_avoid', {
      block: ahead ? ahead.name : 'terrain',
      pos: ahead ? ahead.position : bot.entity.position,
      dropDepth: scan ? scan.dropDepth : 0
    })
    await waitMs(300)
    return true
  }

  bot.setControlState('forward', true)
  bot.setControlState('sprint', true)

  if (now >= wanderNextJumpAt) {
    let shouldJump = isInWater() || Math.random() < 0.12
    if (shouldJumpForward(scan)) shouldJump = true
    if (scan && scan.dropDepth > CLIFF_DROP_SAFE && hasWaterBucket()) shouldJump = false
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
  if (!bot.entity || !hasFiniteEntityPosition()) return null
  try {
    const yaw = Number.isFinite(bot.entity.yaw) ? bot.entity.yaw : 0
    const dx = -Math.sin(yaw) * dist
    const dz = -Math.cos(yaw) * dist
    const ahead = bot.entity.position.offset(dx, -0.5, dz)
    return bot.blockAt(ahead.floored())
  } catch { return null }
}

function shouldAvoidBlock(block) {
  if (!block) return true
  const name = block.name || ''
  if (name === 'air' || name === 'cave_air') return false
  if (name === 'lava' || name === 'flowing_lava') return true
  if (name === 'cactus') return true
  if (name === 'magma_block') return true
  return false
}

function autoMotionTick() {
  if (!autoProgressEnabled) {
    clearWanderControls()
    return
  }

  if (!hasFiniteEntityPosition()) {
    clearWanderControls()
    return
  }

  // Р’Рѕ РІСЂРµРјСЏ knockback вЂ” РќР• РІРјРµС€РёРІР°РµРјСЃСЏ!
  if (isInKnockback()) return

  if (isInWater()) {
    bot.setControlState('jump', true)
  }

  if (isBotBusyWithPath() && Date.now() >= damageRecoveryUntil) return

  if (currentObjective && currentObjective.type !== 'wander') {
    const shouldKeepSearching =
      Date.now() < damageRecoveryUntil ||
      Date.now() < searchMotionUntil ||
      Date.now() - currentObjective.lastProgressAt > 4000

    if (shouldKeepSearching) {
      if (Date.now() - lastSearchAnalyzeAt >= SEARCH_ANALYZE_INTERVAL_MS) {
        analyzeSearchArea().catch(() => {})
        return
      }
      markSearchMotion(1600)
      roamWorld().catch(() => {})
      return
    }

    if (!isInWater()) clearWanderControls()
    return
  }

  roamWorld().catch(() => {})
}

// в”Ђв”Ђв”Ђ STAGE DETECTION в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

// в”Ђв”Ђв”Ђ CRAFTING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

function isReplaceablePlacementBlock(block) {
  if (!block) return false
  const name = block.name || ''
  return block.type === 0 || [
    'air', 'cave_air', 'void_air',
    'grass', 'tall_grass', 'snow',
    'water', 'flowing_water'
  ].includes(name)
}

function isSolidPlacementBase(block) {
  if (!block) return false
  const name = block.name || ''
  if (block.boundingBox !== 'block') return false
  if (['water', 'flowing_water', 'lava', 'flowing_lava'].includes(name)) return false
  return true
}

function findPlacementCandidates(radius = 3) {
  if (!bot.entity) return []

  const feet = bot.entity.position.floored()
  const candidates = []

  for (let yOffset = -1; yOffset <= 0; yOffset++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const basePos = feet.plus(new Vec3(dx, yOffset, dz))
        const placePos = basePos.offset(0, 1, 0)
        const headPos = basePos.offset(0, 2, 0)
        const base = bot.blockAt(basePos)
        const place = bot.blockAt(placePos)
        const head = bot.blockAt(headPos)
        if (!isSolidPlacementBase(base)) continue
        if (!isReplaceablePlacementBlock(place)) continue
        if (!isReplaceablePlacementBlock(head)) continue

        const dist = bot.entity.position.distanceTo(placePos.offset(0.5, 0.5, 0.5))
        candidates.push({ base, placePos, score: dist + Math.abs(yOffset) * 0.6 })
      }
    }
  }

  return candidates.sort((a, b) => a.score - b.score)
}

async function placeBlockNearBot(itemName) {
  const existing =
    itemName === 'crafting_table' ? getNearbyCraftingTable() :
    itemName === 'furnace' ? getNearbyFurnace() :
    null
  if (existing) return existing

  const item = bot.inventory.items().find((it) => it.name === itemName)
  if (!item) return null

  const candidates = findPlacementCandidates(3)
  let lastError = 'no placement candidates'

  for (const candidate of candidates) {
    try {
      forceStopEverything()
      await gotoNearWithTimeout(candidate.placePos, 3, 3500)
      await waitMs(100)
      await bot.equip(item, 'hand')
      await bot.lookAt(candidate.base.position.offset(0.5, 1, 0.5), true)
      await waitMs(150)
      await bot.placeBlock(candidate.base, new Vec3(0, 1, 0))
      await waitMs(250)

      const placed =
        itemName === 'crafting_table' ? getNearbyCraftingTable() :
        itemName === 'furnace' ? getNearbyFurnace() :
        bot.blockAt(candidate.placePos)

      if (placed) {
        saveMemory('place_block', { block: itemName, pos: placed.position || candidate.placePos })
        return placed
      }
    } catch (err) {
      lastError = err.message
      saveMemory('place_block_fail', { block: itemName, target: candidate.placePos, msg: err.message })
    }
  }

  saveMemory('place_block_fail', { block: itemName, msg: lastError })
  return null
}

async function ensurePlanks(minCount) {
  let loops = 0
  while (anyItemCount(PLANK_NAMES) < minCount && loops < 6) {
    loops++
    if (anyItemCount(LOG_NAMES) === 0) {
      const mined = await mineNearestBlock(LOG_NAMES, 40)
      if (!mined) {
        await searchForTarget('wood')
        return false
      }
    } else {
      const ok = await craftAnyPlanks(1)
      if (!ok) return false
    }
    await waitMs(150)
  }
  return anyItemCount(PLANK_NAMES) >= minCount
}

async function ensureSticks(minCount) {
  let loops = 0
  while (itemCount('stick') < minCount && loops < 4) {
    loops++
    const hasPlanks = await ensurePlanks(2)
    if (!hasPlanks) return false
    const ok = await craftItem('stick', 1, null)
    if (!ok && itemCount('stick') < minCount) return false
    await waitMs(150)
  }
  return itemCount('stick') >= minCount
}

async function ensureCobblestone(minCount) {
  let loops = 0
  while (itemCount('cobblestone') < minCount && loops < 6) {
    loops++
    if (!hasAnyPickaxe()) return false
    const pick = itemByNames(PICKAXE_NAMES)
    if (pick) try { await bot.equip(pick, 'hand') } catch {}
    const mined = await mineNearestBlock(['stone', 'cobblestone'], 20)
    if (!mined) {
      await searchForTarget('stone')
      return false
    }
    await waitMs(150)
  }
  return itemCount('cobblestone') >= minCount
}

async function ensureCraftingTableReady() {
  let table = getNearbyCraftingTable()
  if (!table && itemCount('crafting_table') === 0) {
    const planksReady = await ensurePlanks(4)
    if (!planksReady) return null
    const crafted = await craftItem('crafting_table', 1, null)
    if (!crafted && itemCount('crafting_table') === 0) return null
  }

  if (!table) table = await placeBlockNearBot('crafting_table')
  if (!table) return null

  try {
    await gotoNearWithTimeout(table.position, 2, 3000)
  } catch {}
  return getNearbyCraftingTable() || table
}

async function craftToolWithPrep(itemName, materialKind) {
  if (itemCount(itemName) > 0) return true

  if (materialKind === 'wood') {
    const planksReady = await ensurePlanks(5)
    if (!planksReady) return false
  }

  if (materialKind === 'stone') {
    const stoneReady = await ensureCobblestone(3)
    if (!stoneReady) return false
  }

  const sticksReady = await ensureSticks(2)
  if (!sticksReady) return false

  if (materialKind === 'wood' && anyItemCount(PLANK_NAMES) < 3) {
    const morePlanks = await ensurePlanks(3)
    if (!morePlanks) return false
  }

  const table = await ensureCraftingTableReady()
  if (!table) {
    await searchForTarget('open place')
    return false
  }

  return craftItem(itemName, 1, table)
}

async function craftItem(itemName, amount = 1, tableBlock = null) {
  if (!mcData || !mcData.itemsByName[itemName]) return false

  forceStopEverything()
  await waitMs(150)

  const item = mcData.itemsByName[itemName]
  let usableTable = tableBlock
  if (usableTable && usableTable.position) {
    try {
      await gotoNearWithTimeout(usableTable.position, 2, 3000)
    } catch {}
    usableTable = bot.blockAt(usableTable.position) || usableTable
  }

  let recipes = bot.recipesFor(item.id, null, amount, usableTable)
  if ((!recipes || recipes.length === 0) && usableTable) {
    recipes = bot.recipesFor(item.id, null, amount, getNearbyCraftingTable() || usableTable)
  }
  if (!recipes || recipes.length === 0) return false
  const beforeCount = itemCount(itemName)

  try {
    await withTimeout(new Promise((resolve, reject) => {
      bot.craft(recipes[0], amount, tableBlock, (err) => {
        if (err) return reject(err)
        resolve()
      })
    }), CRAFT_TIMEOUT_MS, 'craft')
    await waitMs(300)
    const afterCount = itemCount(itemName)
    saveMemory('craft_success', { item: itemName, amount, beforeCount, afterCount })
    return true
  } catch (err) {
    await waitMs(500)
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
  const plankPairs = [
    ['oak_log', 'oak_planks'],
    ['spruce_log', 'spruce_planks'],
    ['birch_log', 'birch_planks'],
    ['jungle_log', 'jungle_planks'],
    ['acacia_log', 'acacia_planks'],
    ['dark_oak_log', 'dark_oak_planks']
  ]

  for (const [logName, plankName] of plankPairs) {
    if (itemCount(logName) <= 0) continue
    const ok = await craftItem(plankName, amount, null)
    if (ok) return true
  }

  for (const plankName of PLANK_NAMES) {
    if (itemCount(plankName) > 0) return true
  }

  return false
}

async function placeCraftingTableNearBot() {
  return ensureCraftingTableReady()
}

// в”Ђв”Ђв”Ђ MINING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function mineNearestBlock(blockNames, maxDistance = 16) {
  if (!mcData) return false
  // РќРµ РєРѕРїР°РµРј РІРѕ РІСЂРµРјСЏ knockback
  if (isInKnockback()) return false

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
    await waitMs(400)
    const nearbyDrop = findUsefulDroppedItem(6)
    if (nearbyDrop) {
      await collectDroppedItem(nearbyDrop.id)
    }
    saveMemory('mine_success', { block: target.name, pos: target.position })
    return true
  } catch (err) {
    saveMemory('mine_fail', { block: target.name, msg: err.message })
    return false
  }
}

// в”Ђв”Ђв”Ђ OBJECTIVE CHOOSING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function chooseNextObjective() {
  if (isInWater() && isCurrentlySwimming && Date.now() - swimStartedAt > 10000) {
    return { type: 'swim_to_shore' }
  }

  const nearbyHostile = nearestHostile(14)
  if (nearbyHostile && (!hasSwordWeapon() || bot.health < LOW_HEALTH_FLEE_THRESHOLD)) {
    return { type: 'flee', mobId: nearbyHostile.id, mobName: nearbyHostile.name, source: 'panic_flee' }
  }

  const exclusiveHostile = getExclusiveHostileObjective(12)
  if (exclusiveHostile) {
    return exclusiveHostile
  }

  if (needsToEat()) {
    return { type: 'eat_food' }
  }

  const usefulDrop = findUsefulDroppedItem()
  if (usefulDrop) {
    return { type: 'collect_drop', dropId: usefulDrop.id, dropName: usefulDrop.displayName || usefulDrop.name }
  }

  if (isVillageWorthSearching(64) && findNearestChest(36, false)) {
    return { type: 'loot_chest' }
  }

  if (needsToHuntForFood()) {
    return { type: 'hunt_for_food' }
  }

  const golem = nearestIronGolem(28)
  if (golem && bot.health >= 14) {
    return { type: 'hunt_golem', mobId: golem.id }
  }

  const stage = getStage()

  if (stage === 'wood_age') {
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
    if (itemCount('wooden_axe') === 0) {
      return { type: 'craft_wooden_axe' }
    }
  }

  if (stage === 'stone_age') {
    if (anyItemCount(LOG_NAMES) < 12) {
      return { type: 'gather_wood', targetLogs: 16 }
    }
    if (itemCount('cobblestone') < 8) {
      return { type: 'mine_stone' }
    }
    if (itemCount('stone_pickaxe') === 0 && itemCount('cobblestone') >= 3) {
      return { type: 'craft_stone_pickaxe' }
    }
    if (itemCount('stone_axe') === 0 && itemCount('cobblestone') >= 3) {
      return { type: 'craft_stone_axe' }
    }
    if (itemCount('furnace') === 0 && !getNearbyFurnace()) {
      return { type: 'craft_furnace' }
    }
    if (itemCount('iron_ore') < 6) {
      return { type: 'mine_iron', targetOre: 6 }
    }
  }

  if (anyItemCount(LOG_NAMES) < 16) {
    return { type: 'gather_wood', targetLogs: 20 }
  }

  const villageInfo = getVillageInfo(64)
  if (villageInfo && !findNearestChest(36, false)) {
    markVillageExhausted(villageInfo.key, 'village checked with no more chests')
  }
  if (isVillageWorthSearching(64)) {
    return { type: 'go_village' }
  }

  if (stage === 'stone_age') {
    return { type: 'mine_iron', targetOre: 12 }
  }

  return { type: 'wander' }
}

// в”Ђв”Ђв”Ђ EXECUTE OBJECTIVE в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function executeCurrentObjective() {
  if (!currentObjective) return
  if (!hasFiniteEntityPosition()) return
  
  // Р’Рѕ РІСЂРµРјСЏ knockback вЂ” РїСЂРѕРїСѓСЃРєР°РµРј РІС‹РїРѕР»РЅРµРЅРёРµ, РЅРѕ РЅРµ РѕС‚РјРµРЅСЏРµРј С†РµР»СЊ
  if (isInKnockback()) {
    // РџСЂРѕСЃС‚Рѕ Р¶РґС‘Рј РѕРєРѕРЅС‡Р°РЅРёСЏ knockback
    return
  }
  
  const obj = currentObjective
  let status = 'continue'

  if (isInWater()) {
    bot.setControlState('jump', true)
  }

  try {
    switch (obj.type) {
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
        if (bot.health < LOW_HEALTH_FLEE_THRESHOLD || !hasSwordWeapon()) {
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

      case 'collect_drop': {
        const drop = entityById(obj.data.dropId) || findUsefulDroppedItem(10)
        if (!drop) { status = 'done'; break }
        const picked = await collectDroppedItem(drop.id)
        status = picked ? 'done' : 'continue'
        break
      }

      case 'hunt_for_food': {
        if (foodCount() >= FOOD_ITEMS_MIN) { 
          status = 'done' 
          break 
        }
        const got = await huntForFood()
        if (got) {
          objectiveProgress({ action: 'got_food' })
        } else {
          await searchForTarget('food')
        }
        status = 'continue'
        break
      }

      case 'loot_chest': {
        if (await lootNearbyVillageChest()) {
          status = 'done'
        } else if (!isVillageWorthSearching(64)) {
          status = 'fail'
        } else if (!isLikelyVillageNearby()) {
          await searchForTarget('village')
          status = 'continue'
        } else {
          await searchForTarget('village chest')
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
        const mined = await mineNearestBlock(LOG_NAMES, 40)
        if (mined) {
          objectiveProgress({ action: 'mined_log' })
        } else {
          await searchForTarget('wood')
        }
        status = 'continue'
        break
      }

      case 'craft_planks': {
        if (anyItemCount(PLANK_NAMES) >= 8) { status = 'done'; break }
        if (anyItemCount(LOG_NAMES) === 0) {
          const mined = await mineNearestBlock(LOG_NAMES, 40)
          if (!mined) await searchForTarget('wood')
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
          if (!mined) await searchForTarget('wood')
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
        const crafted = await craftToolWithPrep('wooden_pickaxe', 'wood')
        status = crafted ? 'done' : 'continue'
        break
      }

      case 'craft_wooden_axe': {
        const crafted = await craftToolWithPrep('wooden_axe', 'wood')
        status = crafted ? 'done' : 'continue'
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
          await searchForTarget('stone')
        }
        status = 'continue'
        break
      }

      case 'craft_stone_pickaxe': {
        const crafted = await craftToolWithPrep('stone_pickaxe', 'stone')
        status = crafted ? 'done' : 'continue'
        break
      }

      case 'craft_stone_axe': {
        const crafted = await craftToolWithPrep('stone_axe', 'stone')
        status = crafted ? 'done' : 'continue'
        break
      }

      case 'craft_furnace': {
        if (itemCount('furnace') > 0 || getNearbyFurnace()) { status = 'done'; break }
        const stoneReady = await ensureCobblestone(8)
        if (!stoneReady) {
          await searchForTarget('stone')
          status = 'continue'
          break
        }
        const table = await ensureCraftingTableReady()
        if (!table) {
          await searchForTarget('open place')
          status = 'continue'
          break
        }
        status = (await craftItem('furnace', 1, table)) ? 'done' : 'continue'
        break
      }

      case 'mine_iron': {
        const targetOre = obj.data.targetOre || 3
        if (itemCount('iron_ore') >= targetOre) { status = 'done'; break }
        if (itemCount('stone_pickaxe') === 0 && itemCount('iron_pickaxe') === 0 && itemCount('diamond_pickaxe') === 0) {
          status = 'fail'
          break
        }
        const pick = itemByNames(['diamond_pickaxe', 'iron_pickaxe', 'stone_pickaxe'])
        if (pick) try { await bot.equip(pick, 'hand') } catch {}
        const mined = await mineNearestBlock(['iron_ore'], 28)
        if (mined) {
          objectiveProgress({ action: 'mined_iron' })
        } else {
          await searchForTarget('iron')
        }
        status = 'continue'
        break
      }

      case 'go_village': {
        if (!isVillageWorthSearching(64)) {
          status = 'fail'
          break
        }
        if (await goToVillageClue()) {
          status = 'done'
        } else {
          await searchForTarget('village')
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

  if (currentObjective !== obj) return

  if (status === 'continue') {
    objectiveProgress({ objective: obj.type })
  } else if (status === 'done') {
    clearObjective('done')
  } else if (status === 'fail') {
    clearObjective('fail', 'objective failed')
  }
}

// в”Ђв”Ђв”Ђ MAIN AUTO LOOP в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
async function runAutoProgress() {
  if (!autoProgressEnabled || !mcData) return
  if (isPositionRecovering()) return
  const runStartNonce = actionInterruptNonce
  let runObjectiveId = 0

  if (autoProgressBusy) {
    if (Date.now() - autoProgressBusySince > BUSY_GUARD_TIMEOUT_MS) {
      say('Auto progress was stuck for 30s вЂ” force resetting.')
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
        inWater: isInWater(),
        inKnockback: isInKnockback()
      })
      lastAutoTickLogAt = now
    }

    // РќРµ РїСЂРѕРІРµСЂСЏРµРј stuck РІРѕ РІСЂРµРјСЏ knockback
    if (!isInKnockback()) {
      const isStuck = checkStuck()
      if (isStuck) {
        say('Detected stuck вЂ” running unstick maneuver')
        clearObjective('fail', 'stuck detected')
        forceStopEverything()
        setObjective('unstick', {})
      }
    }

    const exclusiveHostile = getExclusiveHostileObjective(14)
    if (exclusiveHostile) {
      const sameExclusive =
        currentObjective &&
        currentObjective.type === exclusiveHostile.type &&
        currentObjective.data &&
        currentObjective.data.mobId === exclusiveHostile.mobId

      if (!sameExclusive) {
        saveMemory('exclusive_hostile_objective', {
          hostile: exclusiveHostile.mobName,
          mobId: exclusiveHostile.mobId,
          type: exclusiveHostile.type,
          armed: exclusiveHostile.armed,
          careful: exclusiveHostile.careful,
          replaced: currentObjective ? currentObjective.type : null
        })
        forceStopEverything()
        setObjective(exclusiveHostile.type, exclusiveHostile)
      }
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

    runObjectiveId = currentObjective ? currentObjective.id : 0
    await executeCurrentObjective()
  } catch (err) {
    const interrupted =
      runStartNonce !== actionInterruptNonce ||
      (err && typeof err.message === 'string' && err.message.includes('interrupted'))
    saveMemory('auto_progress_error', { msg: err.message, stack: err.stack })
    if (!interrupted) {
      if (currentObjective && currentObjective.id === runObjectiveId) {
        clearObjective('fail', err.message)
      }
      forceStopEverything()
    } else {
      saveMemory('auto_progress_interrupted', {
        msg: err.message,
        reason: actionInterruptReason || 'interrupt'
      })
    }
  } finally {
    autoProgressBusy = false
  }
}

// в”Ђв”Ђв”Ђ OBSERVERS в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
  if (isInKnockback()) return // РќРµ СЃР»РµРґСѓРµРј РІРѕ РІСЂРµРјСЏ knockback
  try {
    const target = bot.players[followTarget]
    if (!target || !target.entity) return
    const goal = new goals.GoalFollow(target.entity, 2)
    bot.pathfinder.setGoal(goal, true)
  } catch {}
}

// в”Ђв”Ђв”Ђ DAMAGE REACTION (РџРћР›РќРћРЎРўР¬Р® РџР•Р Р•РџРРЎРђРќРћ) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function reactToDamage() {
  if (!bot.entity) return

  const now = Date.now()
  if (now - lastDamageAt < 100) return
  lastDamageAt = now

  damageHitCount++

  const damageSource = findDamageSource(6)
  const alreadyKnocked = isInKnockback()
  damageReplanPending = true

  // При получении урона бот не должен спорить с ванильной механикой.
  // Просто срываем текущее действие и отдаём контроль серверной физике.
  if (!alreadyKnocked) {
    interruptCurrentActions('damage_knockback')
  }
  damageRecoveryUntil = now + KNOCKBACK_DURATION_MS + DAMAGE_REACTION_DELAY_MS
  applyKnockback(damageSource)

  if (!isInKnockback()) {
    queuePostKnockbackResume()
  }

  saveMemory('damage_taken', {
    health: bot.health,
    objective: currentObjective ? currentObjective.type : null,
    pos: getBestKnownPosition(),
    source: damageSource ? damageSource.name : 'unknown',
    hitCount: damageHitCount
  })

  if (now - lastDamageReactionChat > 3000 && Math.random() < 0.4) {
    try { bot.chat(t('damaged')) } catch {}
    lastDamageReactionChat = now
  }

  if (currentObjective) {
    objectiveProgress({ action: 'damage_knockback', health: bot.health })
  }

  const hostile = nearestHostile(10)
  if (autoProgressEnabled && hostile) {
    if (!currentObjective || !['defend_hostile', 'flee'].includes(currentObjective.type)) {
      if (bot.health < LOW_HEALTH_FLEE_THRESHOLD || !hasSwordWeapon()) {
        setTimeout(() => {
          if ((!hasSwordWeapon() || bot.health < LOW_HEALTH_FLEE_THRESHOLD) && nearestHostile(10)) {
            clearObjective('replaced', 'low health flee after damage')
            setObjective('flee', { mobId: hostile.id, mobName: hostile.name })
          }
        }, KNOCKBACK_DURATION_MS + 100)
      } else if (bot.health >= SAFE_COMBAT_HEALTH) {
        setTimeout(() => {
          const stillHostile = nearestHostile(10)
          if (stillHostile && (!currentObjective || !['defend_hostile', 'flee'].includes(currentObjective.type))) {
            clearObjective('replaced', 'defend after damage')
            setObjective('defend_hostile', { mobId: stillHostile.id, mobName: stillHostile.name })
          }
        }, KNOCKBACK_DURATION_MS + 100)
      }
    }
  }
}

function healthMonitor() {
  if (!bot.entity) return

  rememberFinitePosition()
  if (hasFiniteEntityPosition()) {
    invalidPositionHoldUntil = 0
  }
  const currentHealth = typeof bot.health === 'number' ? bot.health : lastKnownHealth
  const knockbackActive = knockbackTick()

  if (knockbackActive) {
    lastKnownHealth = currentHealth
    return
  }

  if (!hasFiniteEntityPosition()) {
    airStuckRecoveryTick()
    lastKnownHealth = currentHealth
    return
  }

  swimTick()
  headLookTick()
  attemptWaterBucketClutch().catch(() => {})
  if (airStuckRecoveryTick()) return

  if (currentHealth < lastKnownHealth - 0.5) {
    reactToDamage()
  }
  lastKnownHealth = currentHealth

  if (bot.health < LOW_HEALTH_FLEE_THRESHOLD && autoProgressEnabled && !isInKnockback()) {
    const hostile = nearestHostile(12)
    if (hostile && (!currentObjective || currentObjective.type !== 'flee')) {
      say('Low health! Fleeing!')
      if (currentObjective) clearObjective('fail', 'low health flee')
      forceStopEverything()
      setObjective('flee', { mobId: hostile.id, mobName: hostile.name })
    }
  }

  try {
    const feetBlock = bot.blockAt(bot.entity.position.floored())
    if (feetBlock && (feetBlock.name === 'lava' || feetBlock.name === 'flowing_lava')) {
      saveMemory('in_lava', { pos: bot.entity.position })
      bot.setControlState('jump', true)
      bot.setControlState('forward', true)
    }
  } catch {}
}

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

  say(t('connected', { username: USERNAME, host: HOST, port: PORT, version: VERSION }))
  saveMemory('spawn', { username: USERNAME, host: HOST, port: PORT, version: VERSION })
  saveMemory('knowledge_bootstrap', { roadmap: PLAYTHROUGH_KNOWLEDGE })
  lastKnownHealth = typeof bot.health === 'number' ? bot.health : 20
  lastDamageAt = 0
  damageRecoveryUntil = 0
  knockbackUntil = 0
  knockbackDirection = null
  damageHitCount = 0
  announceCommandsInChat()

  setInterval(observeAndLearn, 4000)
  setInterval(tryFollowPlayer, 1500)
  setInterval(runAutoProgress, 3500)
  setInterval(autoMotionTick, 900)
  setInterval(healthMonitor, 50)  // Р§Р°С‰Рµ! Р”Р»СЏ knockback
})

// в”Ђв”Ђв”Ђ EVENTS в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
bot.on('blockUpdate', (oldBlock, newBlock) => {
  try {
    if (!oldBlock || !newBlock) return
    if (oldBlock.type !== 0 && newBlock.type === 0) {
      saveMemory('block_broken_detected', { block: oldBlock.name, pos: oldBlock.position })
    }
  } catch {}
})

bot.on('entityHurt', (entity) => {
  try {
    if (!entity || !bot.entity) return
    if (entity.id !== bot.entity.id) return
    reactToDamage()
  } catch {}
})

bot.on('death', () => {
  saveMemory('death', { pos: getBestKnownPosition() })
  say('Bot died! Resetting objective.')
  forceStopEverything()
  clearObjective('fail', 'death')
  lastPositions = []
  stuckCounter = 0
  isCurrentlySwimming = false
  lastDamageAt = 0
  damageRecoveryUntil = 0
  damageReplanPending = false
  knockbackUntil = 0
  knockbackDirection = null
  damageHitCount = 0
  lastAirRecoveryAt = 0
  invalidPositionHoldUntil = 0
  resetAirStuckState()
})

bot.on('respawn', () => {
  saveMemory('respawn', {})
  say('Respawned.')
  lastPositions = []
  stuckCounter = 0
  isCurrentlySwimming = false
  lastKnownHealth = typeof bot.health === 'number' ? bot.health : 20
  lastDamageAt = 0
  damageRecoveryUntil = 0
  damageReplanPending = false
  knockbackUntil = 0
  knockbackDirection = null
  damageHitCount = 0
  lastAirRecoveryAt = 0
  invalidPositionHoldUntil = 0
  resetAirStuckState()
})

bot.on('path_update', (results) => {
  if (results.status === 'noPath') {
    saveMemory('path_no_path', { pos: bot.entity ? bot.entity.position : null })
    try { bot.pathfinder.setGoal(null) } catch {}
    pathTaskActive = false
  }
})

// в”Ђв”Ђв”Ђ CHAT в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function sendRoadmapToChat() {
  const objective = currentObjective 
    ? `${currentObjective.type} (${Math.round((Date.now() - currentObjective.startedAt) / 1000)}s)` 
    : (botSettings.language === 'en' ? 'none' : '\u043d\u0435\u0442')
  const swimming = isInWater()
    ? (botSettings.language === 'en' ? ' [SWIMMING]' : ' [\u041f\u041b\u0410\u0412\u0410\u042e]')
    : ''
  bot.chat(t('status', {
    autoOn: autoProgressEnabled,
    stage: stageLabel(currentStage),
    objective,
    hp: Math.round(bot.health),
    food: bot.food,
    foodItems: foodCount(),
    swimming
  }))
}

function announceCommandsInChat() {
  bot.chat(t('commands'))
  setTimeout(() => {
    bot.chat(t('intro'))
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
  if (items.length === 0) { bot.chat(t('inventoryEmpty')); return }
  const preview = items.slice(0, 10).join(', ')
  const extra = items.length > 10
    ? (botSettings.language === 'en' ? ` (+${items.length - 10} more)` : ` (+\u0435\u0449\u0435 ${items.length - 10})`)
    : ''
  bot.chat(t('inventory', { preview, extra }))
}

function gracefulLeave() {
  saveMemory('leave_command', { by: 'chat' })
  bot.chat(t('leavingNow'))
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
    bot.chat(t('stopped'))
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
    knockbackUntil = 0
    knockbackDirection = null
    if (!currentObjective) {
      const next = chooseNextObjective()
      setObjective(next.type, next)
    }
    bot.chat(t('autoOn'))
    return
  }

  if (txt === 'bot auto off') {
    autoProgressEnabled = false
    clearObjective('paused', 'auto off')
    clearWanderControls()
    bot.chat(t('autoOff'))
    return
  }

  if (txt === 'bot follow me') {
    if (autoProgressEnabled) {
      bot.chat(t('autoOffFirst'))
      return
    }
    followTarget = username
    bot.chat(t('following', { username }))
    return
  }

  if (txt === 'bot memory') { bot.chat(t('memoryFile', { file: path.basename(memoryFile) })); return }
  if (txt === 'bot status' || txt === 'bot goal' || txt === 'bot knowledge') { sendRoadmapToChat(); return }
})

// в”Ђв”Ђв”Ђ ERROR HANDLING в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
function printHintFromReason(reasonText) {
  const r = String(reasonText || '').toLowerCase()
  if (r.includes('already') && r.includes('logged')) {
    say('Hint: this username is already on the server.')
  } else if (r.includes('verify username') || r.includes('online mode') || r.includes('authentication')) {
    say('Hint: server is in online-mode.')
  } else if (r.includes('connection refused') || r.includes('econnrefused')) {
    say('Hint: wrong LAN port or world is not open to LAN.')
  } else if (r.includes('econnreset') || r.includes('socketclosed') || r.includes('socket closed')) {
    say(`Hint: LAN may have dropped the login. Try a different bot username than "${USERNAME}" and make sure the world is really open to LAN.`)
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

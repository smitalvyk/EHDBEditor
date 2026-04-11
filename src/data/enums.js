// src/data/enums.js

export const ItemType = {
  Undefined: 0, Component: 1, Device: 2, Weapon: 3, AmmunitionObsolete: 4,
  DroneBay: 5, Ship: 6, Satellite: 7, ShipBuild: 8, SatelliteBuild: 9,
  Technology: 10, ComponentStats: 11, ComponentMod: 12, Skill: 13, Faction: 14,
  Quest: 15, Loot: 16, Fleet: 18, Character: 19, QuestItem: 20, Ammunition: 25,
  VisualEffect: 26, BulletPrefab: 27, BehaviorTree: 28, GameObjectPrefab: 29,
  CombatRules: 30, ComponentStatUpgrade: 31, StatUpgradeTemplate: 32,
  FrontierLevel: 33, FrontierCommonLevel: 34, ComponentGroupTag: 35,
  ShipSettings: 100, GalaxySettings: 101, DatabaseSettings: 102,
  ExplorationSettings: 103, FrontierSettings: 104, ShipModSettings: 105,
  SpecialEventSettings: 106, SkillSettings: 107, DebugSettings: 108,
  CombatSettings: 109, UiSettings: 110, FactionsSettings: 111, MusicPlaylist: 112,
  ResearchSetting: 113, PvpSettings: 114, FrontierNpcSettings: 115,
  FrontierLevelSettings: 116, LocalizationSettings: 117, WeaponSlots: 118,
};

export const ItemTypeNames = Object.fromEntries(
  Object.entries(ItemType).map(([k, v]) => [v, k])
);

export const LootType = {
  None: 0, SomeMoney: 1, Fuel: 2, Money: 3, Stars: 4, StarMap: 5,
  RandomComponents: 10, RandomItems: 20, AllItems: 21, ItemsWithChance: 22,
  QuestItem: 25, Ship: 30, EmptyShip: 31, Component: 35, Blueprint: 40,
  ResearchPoints: 41, Satellite: 45
};

export const FactionListType = {
  AllButList: 0, ListOnly: 1, StarOwnersAndList: 2, AllAvailable: 3
};

// === MAPS ===
export const RequiredViewModeMap = {
  0: "Any", 1: "StarSystem", 2: "StarMap", 3: "GalaxyMap"
};

export const QuestOriginTypeMap = {
  0: "CurrentStar", 1: "CurrentFactionBase", 2: "RandomFactionBase", 3: "HomeStar", 4: "RandomStar"
};

export const RequirementTypeMap = {
  0: "Empty", 1: "Any", 2: "All", 3: "None", 6: "PlayerPosition", 7: "RandomStarSystem",
  8: "AggressiveOccupants", 9: "QuestCompleted", 10: "QuestActive", 15: "CharacterRelations",
  16: "FactionRelations", 17: "StarbaseCaptured", 18: "FactionStarbasePower", 19: "IsHostileFaction",
  20: "Faction", 25: "HaveQuestItem", 26: "HaveItem", 27: "HaveItemById", 30: "ComeToOrigin",
  40: "TimeSinceQuestStart", 41: "TimeSinceLastCompletion"
};

export const QuestNodeTypeMap = {
  0: "Undefined", 1: "ComingSoon", 10: "ShowDialog", 11: "OpenShipyard", 12: "OpenWorkshop",
  15: "Switch", 16: "Random", 17: "Condition", 20: "AttackFleet", 21: "AttackOccupants",
  22: "AttackStarbase", 25: "DestroyOccupants", 26: "SuppressOccupants", 30: "Retreat",
  35: "ReceiveItem", 36: "RemoveItem", 37: "Trade", 40: "CompleteQuest", 41: "FailQuest",
  42: "CancelQuest", 43: "StartQuest", 50: "SetCharacterRelations", 51: "SetFactionRelations",
  52: "SetFactionStarbasePower", 55: "ChangeCharacterRelations", 56: "ChangeFactionRelations",
  57: "ChangeFactionStarbasePower", 60: "CaptureStarBase", 61: "LiberateStarBase", 62: "ChangeFaction"
};

export const BehaviorNodeTypeMap = {
  0: "Success", 9: "Failure", 1: "SubTree", 2: "Selector", 3: "Sequence", 4: "Parallel", 5: "RandomSelector", 6: "Invertor", 7: "Cooldown", 8: "Execute", 10: "ParallelSequence", 11: "PreserveTarget", 12: "IfThenElse", 50: "HasEnoughEnergy", 51: "IsLowOnHp", 52: "IsNotControledByPlayer", 53: "HasIncomingThreat", 54: "HasAdditionalTargets", 55: "IsFasterThanTarget", 56: "HasMainTarget", 57: "MainTargetIsAlly", 58: "MainTargetIsEnemy", 59: "MainTargetLowHp", 60: "MainTargetWithinAttackRange", 61: "HasMothership", 62: "TargetDistance", 63: "HasLongerAttackRange", 100: "FindEnemy", 101: "MoveToAttackRange", 102: "AttackMainTarget", 103: "SelectWeapon", 104: "SpawnDrones", 105: "Ram", 106: "DetonateShip", 107: "Vanish", 108: "MaintainAttackRange", 109: "Wait", 110: "LookAtTarget", 111: "LookForAdditionalTargets", 112: "LookForThreats", 113: "MatchVelocityWithTarget", 114: "ActivateDevice", 115: "RechargeEnergy", 116: "SustainAim", 117: "ChargeWeapons", 118: "Chase", 119: "AvoidThreats", 120: "SlowDown", 121: "UseRecoil", 122: "DefendWithFronalShield", 123: "TrackControllableAmmo", 124: "KeepDistance", 125: "ForgetMainTarget", 126: "EscapeTargetAttackRadius", 127: "AttackAdditionalTargets", 128: "TargetAllyStarbase", 129: "TargetEnemyStarbase", 130: "BypassObstacles", 131: "AttackTurretTargets", 132: "HoldHarpoon", 133: "FindDamagedAlly", 150: "EnginePropulsionForce", 200: "MotherShipRetreated", 201: "MotherShipDestroyed", 202: "FlyAroundMothership", 203: "GoBerserk", 204: "TargetMothership", 205: "MothershipLowHp", 206: "MothershipDistanceExceeded", 207: "MakeTargetMothership", 208: "MothershipLowEnergy", 209: "MothershipLowShield", 300: "ShowMessage", 301: "DebugLog", 302: "SetValue", 303: "GetValue", 304: "SendMessage", 305: "MessageReceived", 306: "TargetMessageSender", 307: "SaveTarget", 308: "LoadTarget", 309: "HasSavedTarget", 310: "ForgetSavedTarget"
};

export const BehaviorRequirementTypeMap = {
  0: "Empty", 1: "Any", 2: "All", 3: "None", 5: "AiLevel", 6: "MinAiLevel", 7: "SizeClass", 10: "HasDevice", 12: "HasDrones", 11: "HasAnyWeapon", 13: "CanRepairAllies", 14: "HasHighRecoilWeapon", 15: "HasChargeableWeapon", 16: "HasRemotelyControlledWeapon", 17: "HasLongRangeWeapon", 18: "HasEngine", 19: "HasHarpoon", 20: "CanRechargeAllies", 50: "IsDrone", 100: "HasKineticResistance", 101: "HasHighManeuverability", 102: "HasHighRammingDamage"
};
export const ToggleStateMap = {
  0: "Default",
  1: "Enabled",
  2: "Disabled"
};
export const VisualEffectTypeMap = {
  0: "Flash", 1: "FlashAdditive", 2: "Shockwave", 3: "Smoke", 4: "SmokeAdditive", 5: "Shake", 6: "Spark", 7: "Lightning", 8: "LightningStrike", 9: "Sprite"
};

export const ColorModeMap = {
  0: "TakeFromOwner", 1: "UseMyOwn", 2: "Blend", 3: "Multiply"
};

export const BulletControllerTypeMap = {
  0: "Projectile", 1: "Homing", 2: "Beam", 3: "Parametric", 4: "Harpoon", 5: "AuraEmitter", 6: "StickyMine"
};
export const BulletTriggerConditionMap = {
  0: "Undefined", 1: "Created", 2: "Destroyed", 3: "Hit", 4: "Disarmed", 5: "Expired", 6: "Detonated", 7: "OutOfAmmo", 8: "Cooldown"
};
export const BulletImpactTypeMap = {
  0: "HitFirstTarget", 1: "HitAllTargets", 2: "DamageOverTime"
};
export const ImpactEffectTypeMap = {
  0: "Damage", 1: "Push", 2: "Pull", 3: "DrainEnergy", 4: "SiphonHitPoints", 5: "SlowDown", 6: "CaptureDrones", 7: "Repair", 8: "RestoreLifetime", 9: "Devour", 10: "Teleport", 11: "DrainShield", 12: "DriveDronesCrazy", 13: "IgnoreShield", 14: "RechargeShield", 15: "RechargeEnergy", 16: "ProgressiveDamage", 17: "PushFromCenter", 18: "PullToCenter"
};
export const BulletEffectTypeMap = {
  0: "PlaySfx", 1: "SpawnStaticSfx", 2: "SpawnBullet", 3: "GravityField"
};
export const AiBulletBehaviorMap = { 0: "Default" };
export const StatModificationTypeMap = {
  0: "None",
  1: "WeaponDamage", 2: "WeaponRange", 3: "WeaponFireRate", 4: "WeaponBulletSpeed", 5: "WeaponBulletMass", 6: "WeaponAoe",
  10: "DroneAttack", 11: "DroneDefense", 12: "DroneSpeed", 13: "DroneRange",
  20: "EnergyCapacity", 21: "EnergyRechargeRate", 22: "ShieldPoints", 23: "ShieldRechargeRate", 24: "ArmorPoints", 25: "ArmorRepairRate",
  30: "Resistance",
  40: "DeviceCooldown", 41: "DeviceRange", 42: "DevicePower",
  50: "EnginePower", 51: "EngineTurnRate",
  60: "Mass", 61: "EnergyCost", 62: "ExtraHitPoints"
};
export const ActivationTypeMap = {
  0: "None",
  1: "Manual",
  2: "Mixed"
};
export const DamageTypeMap = {
  0: "Impact",
  1: "Energy",
  2: "Heat",
  3: "Corrosive"
};

// Placeholder, as there were no values for this enum in XML
export const AmmunitionClassObsoleteMap = {
  0: "Projectile",
  1: "Laser",
  2: "Missile"
};
export const WeaponClassMap = {
  0: "Common",
  1: "Manageable",
  2: "Continuous",
  3: "MashineGun",
  4: "MultiShot",
  5: "RequiredCharging"
};

export const DeviceClassMap = {
  0: "Accelerator",
  1: "Decoy",
  2: "EnergyShield",
  3: "Ghost",
  4: "GravityGenerator",
  5: "PartialShield",
  6: "PointDefense",
  7: "RepairBot",
  8: "Detonator",
  9: "Stealth",
  10: "Teleporter",
  11: "Brake",
  12: "SuperStealth",
  13: "Fortification",
  14: "ToxicWaste",
  15: "WormTail",
  16: "ClonningCenter",
  17: "TimeMachine",
  18: "Jammer",
  19: "DroneCamouflage",
  20: "MissileCamouflage",
  21: "TeleporterV2",
  22: "WormTailV2",
  23: "Retribution"
};
export const ComponentCategoryMap = {
  0: "Undefined",
  1: "Weapon",
  2: "Defense",
  3: "Energy",
  4: "Engine",
  5: "Drones",
  6: "Special"
};
// === SELECT OPTIONS ===
export const SelectOptions = {
  ActivationType: ActivationTypeMap,
  Availability: ["None", "Common", "Rare", "Special", "Hidden", "LootOnly"],
  ComponentCategory: ComponentCategoryMap,
  ComponentStatsType: ["PerComponent", "PerOneCell"],
  DeviceClass: DeviceClassMap,  
  DifficultyClass: ["Default", "Class1", "Class2", "Class3"],
  ModificationQuality: ["N3", "N2", "N1", "P1", "P2", "P3"],
  ObjectPrefabType: ["Undefined", "WormTailSegment", "CircularSpriteObject", "CircularOutlineObject"],
  ShipPerkType: [ "Empty", "AutoTargeting", "HeatDefense", "KineticDefense", "EnergyDefense", "LightWeight", "Infected", "UnlimitedRespawn", "WeaponClass", "SatelliteSize", "EnergyRechargeCooldown", "ShieldRechargeCooldown" ],
  ShipRarity: ["Normal", "Rare", "Hidden", "Unique"],
  ShipType: ["Common", "Drone", "Starbase", "Special", "Flagship"],
  SizeClass: ["Undefined", "Frigate", "Destroyer", "Cruiser", "Battleship", "Titan", "Starbase"],
  SkillType: [ "Undefined", "ShipAttack", "ShipDefense", "StarbaseAttack", "StarbaseDefense", "QuickLearning", "BetterPrices", "BetterLoot", "CommandPoints", "SalvageDrones", "Engineer" ],
  StatModificationType: StatModificationTypeMap,
  TechType: ["Component", "Ship", "Satellite"],
  ToggleState: ["Default", "Enabled", "Disabled"],

  AiDifficultyLevel: { 0: "Easy", 1: "Medium", 2: "Hard" },
  AiWeaponCategory: { 0: "All", 1: "Repair", 2: "Damage", 3: "CaptureDrone", 4: "Recharge" },
  NodeExecutionMode: { 0: "UntilSucceeds", 1: "UntilFails", 2: "UntilFinishes", 3: "Infinitely", 4: "OneTime" },
  FactionFilterType: ["AllButList", "ListOnly", "StarOwnersAndList", "AllAvailable"],
  QuestType: ["Common", "Singleton", "Storyline", "Temporary", "Urgent"],
  StartCondition: [ "Manual", "Beacon", "LocalEncounter", "FactionMission", "GameStart", "NewStarExplored", "ArrivedAtStar", "Daily" ],
  BulletShape: [ "Projectile", "Rocket", "LaserBeam", "LightningBolt", "EnergyBeam", "Spark", "Mine", "Wave", "BlackHole", "Harpoon", "CircularSaw", "PiercingLaser" ],
  ColorMode: ["TakeFromOwner", "UseMyOwn", "Blend", "Multiply"],
  DamageType: DamageTypeMap,
  AmmunitionClassObsolete: AmmunitionClassObsoleteMap,
  WeaponClass: WeaponClassMap,
  LootType: { 0: 'None', 1: 'SomeMoney', 2: 'Fuel', 3: 'Money', 4: 'Stars', 5: 'StarMap', 10: 'RandomComponents', 20: 'RandomItems', 21: 'AllItems', 22: 'ItemsWithChance', 25: 'QuestItem', 30: 'Ship', 31: 'EmptyShip', 35: 'Component', 40: 'Blueprint', 41: 'ResearchPoints', 45: 'Satellite' },
  TimeOutMode: { 0: "CallNextEnemy", 1: "DrainPlayerHp", 2: "CallNextEnemyOrDraw" },
  RewardCondition: { 0: "Default", 1: "Always", 2: "Never" },

  // === GENERATED LISTS ===
  RequiredViewModeList: Object.entries(RequiredViewModeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  QuestOriginTypeList: Object.entries(QuestOriginTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  RequirementTypeList: Object.entries(RequirementTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  QuestNodeTypeList: Object.entries(QuestNodeTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  BehaviorNodeTypeList: Object.entries(BehaviorNodeTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  BehaviorRequirementTypeList: Object.entries(BehaviorRequirementTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  VisualEffectTypeList: Object.entries(VisualEffectTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  ColorModeList: Object.entries(ColorModeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  BulletControllerTypeList: Object.entries(BulletControllerTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  BulletTriggerConditionList: Object.entries(BulletTriggerConditionMap).map(([k, v]) => ({ id: Number(k), name: v })),
  BulletEffectTypeList: Object.entries(BulletEffectTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  ImpactEffectTypeList: Object.entries(ImpactEffectTypeMap).map(([k, v]) => ({ id: Number(k), name: v })),
  BulletImpactType: BulletImpactTypeMap,
  AiBulletBehaviorList: Object.entries(AiBulletBehaviorMap).map(([k, v]) => ({ id: Number(k), name: v })),
};

export const QualityDefinition = [
  { key: "Gray3", label: "Gray 3 (N3)" }, { key: "Gray2", label: "Gray 2 (N2)" }, { key: "Gray1", label: "Gray 1 (N1)" }, { key: "Green", label: "Green (P1)" }, { key: "Purple", label: "Purple (P2)" }, { key: "Gold", label: "Gold (P3)" }
];
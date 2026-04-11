import { ItemType, SelectOptions } from './enums';

// 1. FIELD TYPE REGISTRATION
export const FieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  CHECKBOX: 'checkbox',
  COLOR: 'color',
  VECTOR: 'vector',
  SELECT: 'select',
  REFERENCE: 'ref',
  LAYOUT: 'layout',
  IMAGE: 'image',
  TAG_LIST: 'tag_list',
  MOD_LIST: 'mod_list',
  JSON: 'text', 
  RESTRICTIONS: 'restrictions',
  WEAPON_SLOTS: 'weapon_slots',
  MUSIC_LIST: 'music_list',
  CHEAT_CODE_LIST: 'cheat_code_list',
  
  // === NEW TYPES ===
  BEHAVIOR_TREE: 'behavior_tree',
  VISUAL_EFFECT_ELEMENTS: 'visual_effect_elements',
  AMMUNITION_BLOCK: 'ammunition_block',
  FACTION_FILTER: 'faction_filter',
  LOOT_CONTENT: 'loot_content',
  QUEST_BLOCK: 'quest_block',
  INSTALLED_COMPONENTS: 'installed_components',
  SHIP_PERKS: 'ship_perks',
  BARRELS_LIST: 'barrels_list',
  ENGINES_LIST: 'engines_list',
  SHIP_FEATURES: 'ship_features',
  SHIP_VISUAL_EFFECTS: 'ship_visual_effects',
  COMPONENT_STATS: 'component_stats',
};

const f = (type, label, extra = {}) => ({ type, label, ...extra });

export const itemSchemas = {
  // ==================================================================================
  // BASIC ITEMS
  // ==================================================================================

  [ItemType.Component]: {
    title: 'Component',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      Description: f(FieldType.TEXT, 'Description'),
      DisplayCategory: f(FieldType.SELECT, 'Category', { options: SelectOptions.ComponentCategory }),
      Availability: f(FieldType.SELECT, 'Availability', { options: SelectOptions.Availability }),
      // Reference to ComponentStats (ID 11)
      ComponentStatsId: f(FieldType.REFERENCE, 'Component Stats', { targetType: 11 }),
      Faction: f(FieldType.REFERENCE, 'Faction', { targetType: 14 }),
      Level: f(FieldType.NUMBER, 'Level', { min: 0 }),
      Icon: f(FieldType.IMAGE, 'Icon'),
      Color: f(FieldType.COLOR, 'Color'),
      Layout: f(FieldType.LAYOUT, 'Layout', { fullWidth: true }),
      WeaponSlotType: f(FieldType.TEXT, 'Weapon Slot Type'), // Usually 'L', 'C', etc.
      
      // References to other objects
      DeviceId: f(FieldType.REFERENCE, 'Device', { targetType: 2 }),
      WeaponId: f(FieldType.REFERENCE, 'Weapon', { targetType: 3 }),
      AmmunitionId: f(FieldType.REFERENCE, 'Ammunition / Ammo Obs.', { targetType: 4 }), // Can be 4 or 11
      DroneBayId: f(FieldType.REFERENCE, 'Drone Bay', { targetType: 5 }),
      DroneId: f(FieldType.REFERENCE, 'Drone (ShipBuild)', { targetType: 6 }), // ShipBuild is usually 6 or 7
      
      Restrictions: f(FieldType.RESTRICTIONS, 'Restrictions', { fullWidth: true }),
      PossibleModifications: f(FieldType.TAG_LIST, 'Possible Modifications', { targetType: 12 }) // Target ID for ComponentMod
    }
  },

  // === DEVICE (ID 2) ===
  [ItemType.Device]: {
    title: 'Device',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      DeviceClass: f(FieldType.SELECT, 'Device Class', { options: SelectOptions.DeviceClass }),
      EnergyConsumption: f(FieldType.NUMBER, 'Energy Consumption', { min: 0, max: 999999999 }),
      PassiveEnergyConsumption: f(FieldType.NUMBER, 'Passive Energy Cons.', { min: 0, max: 999999999 }),
      ScaleEnergyWithShipSize: f(FieldType.CHECKBOX, 'Scale Energy With Ship Size', { default: true }),
      Power: f(FieldType.NUMBER, 'Power'),
      Range: f(FieldType.NUMBER, 'Range', { min: 0, max: 1000 }),
      Size: f(FieldType.NUMBER, 'Size', { min: 0, max: 1000 }),
      Cooldown: f(FieldType.NUMBER, 'Cooldown', { min: 0, max: 1000 }),
      Lifetime: f(FieldType.NUMBER, 'Lifetime', { min: 0, max: 1000 }),
      Offset: f(FieldType.VECTOR, 'Offset'),
      ActivationType: f(FieldType.SELECT, 'Activation Type', { options: SelectOptions.ActivationType }),
      Color: f(FieldType.COLOR, 'Color'),
      Sound: f(FieldType.TEXT, 'Sound'),
      EffectPrefab: f(FieldType.TEXT, 'Effect Prefab'),
      
      // Reference to Visual Effect (ID 26)
      VisualEffect: f(FieldType.REFERENCE, 'Visual Effect', { targetType: 26 }),
      
      ObjectPrefab: f(FieldType.TEXT, 'Object Prefab'),
      
      // Dropdown reference to Prefab files (ID 29)
      Prefab: f(FieldType.REFERENCE, 'Prefab', { targetType: 29 }),
      
      // Reference to Ammunition (ID 4)
      AmmunitionId: f(FieldType.REFERENCE, 'Ammunition', { targetType: 4 }),
      
      ControlButtonIcon: f(FieldType.IMAGE, 'Control Button Icon')
    }
  },
  
  [ItemType.Weapon]: {
    title: 'Weapon',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      WeaponClass: f(FieldType.SELECT, 'Weapon Class', { options: SelectOptions.WeaponClass }),
      FireRate: f(FieldType.NUMBER, 'Fire Rate', { min: 0, max: 100 }),
      Spread: f(FieldType.NUMBER, 'Spread', { min: 0, max: 360 }),
      Magazine: f(FieldType.NUMBER, 'Magazine', { min: 0, max: 999999999 }),
      ActivationType: f(FieldType.SELECT, 'Activation Type', { options: SelectOptions.ActivationType }),
      ShotSound: f(FieldType.TEXT, 'Shot Sound'),
      ChargeSound: f(FieldType.TEXT, 'Charge Sound'),
      ShotEffectPrefab: f(FieldType.TEXT, 'Shot Effect Prefab'),
      
      // Reference to Visual Effect (ID 26)
      VisualEffect: f(FieldType.REFERENCE, 'Visual Effect', { targetType: 26 }),
      
      EffectSize: f(FieldType.NUMBER, 'Effect Size', { min: 0, max: 100 }),
      ControlButtonIcon: f(FieldType.IMAGE, 'Control Button Icon')
    }
  },

  // === DRONE BAY (ID 5) ===
  [ItemType.DroneBay]: {
    title: 'Drone Bay',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      EnergyConsumption: f(FieldType.NUMBER, 'Energy Consumption', { min: 0 }),
      PassiveEnergyConsumption: f(FieldType.NUMBER, 'Passive Energy Cons.', { min: 0 }),
      Range: f(FieldType.NUMBER, 'Range', { min: 1, max: 1000 }),
      DamageMultiplier: f(FieldType.NUMBER, 'Damage Multiplier', { min: 0.01, max: 1000 }),
      DefenseMultiplier: f(FieldType.NUMBER, 'Defense Multiplier', { min: 0.01, max: 1000 }),
      SpeedMultiplier: f(FieldType.NUMBER, 'Speed Multiplier', { min: 0.01, max: 1000 }),
      BuildExtraCycles: f(FieldType.NUMBER, 'Build Extra Cycles', { min: 0, max: 100 }),
      Capacity: f(FieldType.NUMBER, 'Capacity', { min: 1, max: 1000 }),
      ActivationType: f(FieldType.SELECT, 'Activation Type', { options: SelectOptions.ActivationType }),
      LaunchSound: f(FieldType.TEXT, 'Launch Sound'),
      LaunchEffectPrefab: f(FieldType.TEXT, 'Launch Effect Prefab'),
      ControlButtonIcon: f(FieldType.IMAGE, 'Control Button Icon'),
      
      // Using REFERENCE for BehaviorTree (ID 28)
      DefensiveDroneAI: f(FieldType.REFERENCE, 'Defensive Drone AI', { targetType: 28 }),
      OffensiveDroneAI: f(FieldType.REFERENCE, 'Offensive Drone AI', { targetType: 28 }),
    }
  },

  [ItemType.Ship]: {
    title: 'Ship',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      ShipType: f(FieldType.SELECT, 'Ship Type', { options: SelectOptions.ShipType }),
      ShipRarity: f(FieldType.SELECT, 'Rarity', { options: SelectOptions.ShipRarity }),
      SizeClass: f(FieldType.SELECT, 'Size Class', { options: SelectOptions.SizeClass }),
      Name: f(FieldType.TEXT, 'Name'),
      Description: f(FieldType.TEXT, 'Description'),
      Faction: f(FieldType.REFERENCE, 'Faction', { targetType: ItemType.Faction }),
      IconImage: f(FieldType.IMAGE, 'Icon Image'),
      IconScale: f(FieldType.NUMBER, 'Icon Scale', { min: 0.1, max: 100 }),
      ModelImage: f(FieldType.IMAGE, 'Model Image'),
      ModelScale: f(FieldType.NUMBER, 'Model Scale', { min: 0.1, max: 500 }),
      EngineColor: f(FieldType.COLOR, 'Engine Color'),
      Engines: f(FieldType.ENGINES_LIST, 'Engines', { fullWidth: true }),
      Layout: f(FieldType.LAYOUT, 'Layout', { fullWidth: true }),
      Barrels: f(FieldType.BARRELS_LIST, 'Barrels', { fullWidth: true }),
      Features: f(FieldType.SHIP_FEATURES, 'Features', { fullWidth: true }),
      VisualEffects: f(FieldType.SHIP_VISUAL_EFFECTS, 'Visual Effects', { fullWidth: true }),
      CellsExpansions: f(FieldType.SELECT, 'Cells Expansions', { options: SelectOptions.ToggleState }),
      ColliderTolerance: f(FieldType.NUMBER, 'Collider Tolerance', { min: 0, max: 1 })
    }
  },

  [ItemType.Satellite]: {
    title: 'Satellite',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      ModelImage: f(FieldType.IMAGE, 'Model Image'),
      ModelScale: f(FieldType.NUMBER, 'Model Scale', { min: 0.1, max: 100 }),
      SizeClass: f(FieldType.SELECT, 'Size Class', { options: SelectOptions.SizeClass }),
      Layout: f(FieldType.LAYOUT, 'Layout', { fullWidth: true }),
      Barrels: f(FieldType.BARRELS_LIST, 'Barrels', { fullWidth: true })
    }
  },

  [ItemType.ShipBuild]: {
    title: 'Ship Build',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      ShipId: f(FieldType.REFERENCE, 'Ship', { targetType: ItemType.Ship }),
      BuildFaction: f(FieldType.REFERENCE, 'Build Faction', { targetType: ItemType.Faction }),
      DifficultyClass: f(FieldType.SELECT, 'Difficulty', { options: SelectOptions.DifficultyClass }),
      AvailableForPlayer: f(FieldType.CHECKBOX, 'Avail. Player', { default: true }),
      AvailableForEnemy: f(FieldType.CHECKBOX, 'Avail. Enemy', { default: true }),
      RandomColor: f(FieldType.CHECKBOX, 'Random Color'),
      ExtendedLayout: f(FieldType.CHECKBOX, 'Extended Layout'),
      CustomAI: f(FieldType.REFERENCE, 'Custom AI', { targetType: ItemType.BehaviorTree }),
      LeftSatelliteBuild: f(FieldType.REFERENCE, 'Left Satellite', { targetType: ItemType.SatelliteBuild }),
      RightSatelliteBuild: f(FieldType.REFERENCE, 'Right Satellite', { targetType: ItemType.SatelliteBuild }),
      Perks: f(FieldType.SHIP_PERKS, 'Perks', { fullWidth: true }),
      Components: f(FieldType.INSTALLED_COMPONENTS, 'Components', { fullWidth: true })
    }
  },

  [ItemType.SatelliteBuild]: {
    title: 'Satellite Build',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      SatelliteId: f(FieldType.REFERENCE, 'Satellite', { targetType: ItemType.Satellite }),
      NotAvailableInGame: f(FieldType.CHECKBOX, 'Not Available In Game'),
      DifficultyClass: f(FieldType.SELECT, 'Difficulty Class', { options: SelectOptions.DifficultyClass }),
      Components: f(FieldType.INSTALLED_COMPONENTS, 'Components', { fullWidth: true })
    }
  },
  
  [ItemType.Technology]: {
    title: 'Technology',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Type: f(FieldType.SELECT, 'Type', { options: SelectOptions.TechType }),
      
      // Item references (in XML these map to ItemId based on Type)
      Component: f(FieldType.REFERENCE, 'Component', { targetType: ItemType.Component }),
      Satellite: f(FieldType.REFERENCE, 'Satellite', { targetType: ItemType.Satellite }),
      Ship: f(FieldType.REFERENCE, 'Ship', { targetType: ItemType.Ship }),
      
      Faction: f(FieldType.REFERENCE, 'Faction', { targetType: ItemType.Faction }),
      
      // Settings and Limits
      Price: f(FieldType.NUMBER, 'Price', { min: 0, max: 10000 }),
      CustomCraftingLevel: f(FieldType.NUMBER, 'Crafting Level', { min: 0 }),
      
      // Flags
      Hidden: f(FieldType.CHECKBOX, 'Hidden'),
      Special: f(FieldType.CHECKBOX, 'Special'),
      DoesnPreventUnlocking: f(FieldType.CHECKBOX, 'Does Not Prevent Unlocking'),
      
      // List (full width)
      Dependencies: f(FieldType.TAG_LIST, 'Dependencies', { targetType: ItemType.Technology, fullWidth: true })
    }
  },

  [ItemType.ComponentStats]: {
    title: 'Component Stats',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Type: f(FieldType.SELECT, 'Stats Type', { options: SelectOptions.ComponentStatsType }),
      ArmorPoints: f(FieldType.NUMBER, 'Armor'),
      EnergyPoints: f(FieldType.NUMBER, 'Energy'),
      ShieldPoints: f(FieldType.NUMBER, 'Shield'),
      Weight: f(FieldType.NUMBER, 'Weight'),
      EnginePower: f(FieldType.NUMBER, 'Engine Power'),
      TurnRate: f(FieldType.NUMBER, 'Turn Rate'),
      EnergyRechargeRate: f(FieldType.NUMBER, 'Energy Recharge Rate'),
      ShieldRechargeRate: f(FieldType.NUMBER, 'Shield Recharge Rate'),
      ArmorRepairRate: f(FieldType.NUMBER, 'Armor Repair Rate'),
      KineticResistance: f(FieldType.NUMBER, 'Kinetic Resistance'),
      EnergyResistance: f(FieldType.NUMBER, 'Energy Resistance'),
      ThermalResistance: f(FieldType.NUMBER, 'Thermal Resistance'),
      WeaponDamageModifier: f(FieldType.NUMBER, 'Weapon Damage Modifier (%)'),
      WeaponRangeModifier: f(FieldType.NUMBER, 'Weapon Range Modifier (%)'),
      DroneDamageModifier: f(FieldType.NUMBER, 'Drone Damage Modifier (%)')
    }
  },

  [ItemType.ComponentMod]: {
    title: 'Component Modification',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Description: f(FieldType.TEXT, 'Description'),
      Modifications: f(FieldType.MOD_LIST, 'Modifications', { fullWidth: true })
    }
  },

  [ItemType.Skill]: {
    title: 'Skill',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      Description: f(FieldType.TEXT, 'Description'),
      Icon: f(FieldType.IMAGE, 'Icon'),
      BasePrice: f(FieldType.NUMBER, 'Base Price'),
      PricePerLevel: f(FieldType.NUMBER, 'Price Per Level'),
      MaxLevel: f(FieldType.NUMBER, 'Max Level')
    }
  },

  [ItemType.Faction]: {
    title: 'Faction',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      Color: f(FieldType.COLOR, 'Color'),
      NoTerritories: f(FieldType.CHECKBOX, 'No Territories'),
      HomeStarDistance: f(FieldType.NUMBER, 'Min Home Dist', { min: 0, max: 5000 }),
      HomeStarDistanceMax: f(FieldType.NUMBER, 'Max Home Dist', { min: 0, max: 5000 }),
      NoWanderingShips: f(FieldType.CHECKBOX, 'No Wandering Ships'),
      WanderingShipsDistance: f(FieldType.NUMBER, 'Min Ship Dist', { min: 0, max: 5000 }),
      WanderingShipsDistanceMax: f(FieldType.NUMBER, 'Max Ship Dist', { min: 0, max: 5000 }),
      HideFromMerchants: f(FieldType.CHECKBOX, 'Hide Merchants'),
      HideResearchTree: f(FieldType.CHECKBOX, 'Hide Research'),
      NoMissions: f(FieldType.CHECKBOX, 'No Missions')
    }
  },

  [ItemType.Quest]: {
    title: 'Quest',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      QuestType: f(FieldType.SELECT, 'Quest Type', { options: SelectOptions.QuestType }),
      StartCondition: f(FieldType.SELECT, 'Start Condition', { options: SelectOptions.StartCondition }),
      Weight: f(FieldType.NUMBER, 'Weight', { min: 0, max: 1000 }),
      Level: f(FieldType.NUMBER, 'Level', { min: 0, max: 1000 }),
      UseRandomSeed: f(FieldType.CHECKBOX, 'Use Random Seed'),
      
      // Quest block sections
      Origin: f(FieldType.QUEST_BLOCK, 'Origin', { blockType: 'origin', fullWidth: true }),
      Requirement: f(FieldType.QUEST_BLOCK, 'Requirements', { blockType: 'requirement', fullWidth: true }),
      Nodes: f(FieldType.QUEST_BLOCK, 'Nodes', { blockType: 'nodes', fullWidth: true })
    }
  },

  [ItemType.Loot]: {
    title: 'Loot Table',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Loot: f(FieldType.LOOT_CONTENT, 'Loot Content', { fullWidth: true })
    }
  },

  [ItemType.Fleet]: {
    title: 'Fleet',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Factions: f(FieldType.FACTION_FILTER, 'Factions Filter', { fullWidth: true }),
      LevelBonus: f(FieldType.NUMBER, 'Level Bonus', { min: -10000, max: 10000 }),
      NoRandomShips: f(FieldType.CHECKBOX, 'No Random Ships'),
      SpecificShips: f(FieldType.TAG_LIST, 'Specific Ships', { targetType: ItemType.ShipBuild, fullWidth: true }),
      CombatRules: f(FieldType.REFERENCE, 'Combat Rules', { targetType: ItemType.CombatRules })
    }
  },

  [ItemType.Character]: {
    title: 'Character',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      AvatarIcon: f(FieldType.IMAGE, 'Avatar Icon'),
      Faction: f(FieldType.REFERENCE, 'Faction', { targetType: ItemType.Faction }),
      Inventory: f(FieldType.REFERENCE, 'Inventory', { targetType: ItemType.Loot }),
      Fleet: f(FieldType.REFERENCE, 'Fleet', { targetType: ItemType.Fleet }),
      Relations: f(FieldType.NUMBER, 'Relations', { min: -100, max: 100 }),
      IsUnique: f(FieldType.CHECKBOX, 'Is Unique')
    }
  },

  [ItemType.QuestItem]: {
    title: 'Quest Item',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Name: f(FieldType.TEXT, 'Name'),
      Description: f(FieldType.TEXT, 'Description'),
      Icon: f(FieldType.IMAGE, 'Icon'),
      Color: f(FieldType.COLOR, 'Color'),
      Price: f(FieldType.NUMBER, 'Price', { min: 0, max: 999999999 })
    }
  },

  [ItemType.Ammunition]: {
    title: 'Ammunition',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      ImpactType: f(FieldType.SELECT, 'Impact Type', { options: SelectOptions.BulletImpactType }),
      
      // Ammunition structured blocks
      Body: f(FieldType.AMMUNITION_BLOCK, 'Body (Structure)', { blockType: 'body', fullWidth: true }),
      Controller: f(FieldType.AMMUNITION_BLOCK, 'Controller (Structure)', { blockType: 'controller', fullWidth: true }),
      Triggers: f(FieldType.AMMUNITION_BLOCK, 'Triggers (List)', { blockType: 'triggers', fullWidth: true }),
      Effects: f(FieldType.AMMUNITION_BLOCK, 'Effects (List)', { blockType: 'effects', fullWidth: true })
    }
  },

  [ItemType.AmmunitionObsolete]: {
    title: 'Ammunition (Obsolete)',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      AmmunitionClass: f(FieldType.SELECT, 'Ammunition Class', { options: SelectOptions.AmmunitionClassObsolete }),
      DamageType: f(FieldType.SELECT, 'Damage Type', { options: SelectOptions.DamageType }),
      Impulse: f(FieldType.NUMBER, 'Impulse', { min: 0, max: 10 }),
      Recoil: f(FieldType.NUMBER, 'Recoil', { min: 0, max: 10 }),
      Size: f(FieldType.NUMBER, 'Size', { min: 0, max: 1000 }),
      InitialPosition: f(FieldType.VECTOR, 'Initial Position'),
      AreaOfEffect: f(FieldType.NUMBER, 'Area Of Effect', { min: 0, max: 1000 }),
      Damage: f(FieldType.NUMBER, 'Damage', { min: 0, max: 999999999 }),
      Range: f(FieldType.NUMBER, 'Range', { min: 0, max: 1000 }),
      Velocity: f(FieldType.NUMBER, 'Velocity', { min: 0, max: 1000 }),
      LifeTime: f(FieldType.NUMBER, 'Life Time', { min: 0, max: 999999999 }),
      HitPoints: f(FieldType.NUMBER, 'Hit Points', { min: 0, max: 999999999 }),
      IgnoresShipVelocity: f(FieldType.CHECKBOX, 'Ignores Ship Velocity'),
      EnergyCost: f(FieldType.NUMBER, 'Energy Cost', { min: 0, max: 999999999 }),
      
      // Reference to another ammunition of the same type (ID 4)
      CoupledAmmunitionId: f(FieldType.REFERENCE, 'Coupled Ammunition', { targetType: 4 }),
      
      Color: f(FieldType.COLOR, 'Color'),
      FireSound: f(FieldType.TEXT, 'Fire Sound'),
      HitSound: f(FieldType.TEXT, 'Hit Sound'),
      HitEffectPrefab: f(FieldType.TEXT, 'Hit Effect Prefab'),
      BulletPrefab: f(FieldType.TEXT, 'Bullet Prefab')
    }
  },

  // === VISUAL EFFECT (ID 26) [UPDATED] ===
  [ItemType.VisualEffect]: {
    title: 'Visual Effect',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Elements: f(FieldType.VISUAL_EFFECT_ELEMENTS, 'Elements', { fullWidth: true })
    }
  },

  // === BULLET PREFAB (ID 27) ===
  [ItemType.BulletPrefab]: {
    title: 'Bullet Prefab',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Shape: f(FieldType.SELECT, 'Shape', { options: SelectOptions.BulletShape }),
      Image: f(FieldType.IMAGE, 'Image'),
      Size: f(FieldType.NUMBER, 'Size', { min: 0.01, max: 100 }),
      Margins: f(FieldType.NUMBER, 'Margins', { min: 0, max: 1 }),
      Deformation: f(FieldType.NUMBER, 'Deformation', { min: -100, max: 100 }),
      MainColor: f(FieldType.COLOR, 'Main Color'),
      MainColorMode: f(FieldType.SELECT, 'Main Color Mode', { options: SelectOptions.ColorMode }),
      SecondColor: f(FieldType.COLOR, 'Second Color'),
      SecondColorMode: f(FieldType.SELECT, 'Second Color Mode', { options: SelectOptions.ColorMode }),
    }
  },

  // === BEHAVIOR TREE (ID 28) [UPDATED] ===
  [ItemType.BehaviorTree]: {
    title: 'Behavior Tree',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      // IMPORTANT: Using BEHAVIOR_TREE
      RootNode: f(FieldType.BEHAVIOR_TREE, 'Root Node', { fullWidth: true })
    }
  },

  // === GAME OBJECT PREFAB (ID 29) ===
  [ItemType.GameObjectPrefab]: {
    title: 'Object Prefab',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      Type: f(FieldType.SELECT, 'Prefab Type', { options: SelectOptions.ObjectPrefabType }),
      Image1: f(FieldType.IMAGE, 'Image 1 (Body/Main)'),
      Image2: f(FieldType.IMAGE, 'Image 2 (Joint)'),
      ImageScale: f(FieldType.NUMBER, 'Scale', { min: 0, max: 10, default: 1 }),
      ImageOffset: f(FieldType.NUMBER, 'Image Offset', { min: -1, max: 1 }),
      Thickness: f(FieldType.NUMBER, 'Thickness (Circular)', { min: 0, max: 1, default: 0.1 }),
      AspectRatio: f(FieldType.NUMBER, 'Aspect Ratio', { min: 0, max: 100, default: 1 }),
      Length: f(FieldType.NUMBER, 'Bone Length', { min: 0, max: 1 }),
      Offset1: f(FieldType.NUMBER, 'Joint Offset', { min: 0, max: 1 }),
      Offset2: f(FieldType.NUMBER, 'Head Offset', { min: -1, max: 1 }),
      Angle1: f(FieldType.NUMBER, 'Max Rotation', { min: 0, max: 180 }),
      Angle2: f(FieldType.NUMBER, 'Max Head Rotation', { min: 0, max: 180 }),
    }
  },

  // === COMBAT RULES (ID 30) ===
  [ItemType.CombatRules]: {
    title: 'Combat Rules',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      InitialEnemyShips: f(FieldType.TEXT, 'InitialEnemyShips', { default: "1" }),
      MaxEnemyShips: f(FieldType.TEXT, 'MaxEnemyShips', { default: "12" }),
      BattleMapSize: f(FieldType.NUMBER, 'BattleMapSize', { default: 200, min: 50 }),
      TimeLimit: f(FieldType.TEXT, 'TimeLimit', { default: "MAX(40, 100 - level)" }),
      TimeOutMode: f(FieldType.SELECT, 'TimeOutMode', { options: SelectOptions.TimeOutMode, default: 0 }),
      LootCondition: f(FieldType.SELECT, 'LootCondition', { options: SelectOptions.RewardCondition, default: 0 }),
      ExpCondition: f(FieldType.SELECT, 'ExpCondition', { options: SelectOptions.RewardCondition, default: 0 }),
      ShipSelection: f(FieldType.NUMBER, 'ShipSelection', { default: 0 }),
      DisableSkillBonuses: f(FieldType.CHECKBOX, 'DisableSkillBonuses', { default: false }),
      DisableRandomLoot: f(FieldType.CHECKBOX, 'DisableRandomLoot', { default: false }),
      DisableAsteroids: f(FieldType.CHECKBOX, 'DisableAsteroids', { default: false }),
      DisablePlanet: f(FieldType.CHECKBOX, 'DisablePlanet', { default: false }),
      NextEnemyButton: f(FieldType.CHECKBOX, 'NextEnemyButton', { default: true }),
      KillThemAllButton: f(FieldType.CHECKBOX, 'KillThemAllButton', { default: false }),
      CustomSoundtrack: f(FieldType.MUSIC_LIST, 'CustomSoundtrack', { default: [] }),
    }
  },

  [ItemType.ComponentGroupTag]: {
    title: 'Component Group Tag',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      MaxInstallableComponents: f(FieldType.NUMBER, 'MaxInstallableComponents', { default: 1, min: 1 }),
    }
  },

  // === SETTINGS ===

  [ItemType.ShipSettings]: {
    title: 'Ship Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      DefaultWeightPerCell: f(FieldType.NUMBER, 'DefaultWeightPerCell'),
      MinimumWeightPerCell: f(FieldType.NUMBER, 'MinimumWeightPerCell'),
      BaseArmorPoints: f(FieldType.NUMBER, 'BaseArmorPoints'),
      ArmorPointsPerCell: f(FieldType.NUMBER, 'ArmorPointsPerCell'),
      ArmorRepairCooldown: f(FieldType.NUMBER, 'ArmorRepairCooldown', { max: 60 }),
      BaseEnergyPoints: f(FieldType.NUMBER, 'BaseEnergyPoints'),
      BaseEnergyRechargeRate: f(FieldType.NUMBER, 'BaseEnergyRechargeRate'),
      EnergyRechargeCooldown: f(FieldType.NUMBER, 'EnergyRechargeCooldown', { max: 60 }),
      BaseShieldRechargeRate: f(FieldType.NUMBER, 'BaseShieldRechargeRate'),
      ShieldRechargeCooldown: f(FieldType.NUMBER, 'ShieldRechargeCooldown', { max: 60 }),
      ShieldCorrosiveResistance: f(FieldType.NUMBER, 'ShieldCorrosiveResistance', { default: 0.9, max: 1 }),
      BaseDroneReconstructionSpeed: f(FieldType.NUMBER, 'BaseDroneReconstructionSpeed', { max: 100 }),
      MaxVelocity: f(FieldType.NUMBER, 'MaxVelocity', { default: 30, min: 5, max: 100 }),
      MaxAngularVelocity: f(FieldType.NUMBER, 'MaxAngularVelocity', { default: 30, min: 5, max: 100 }),
      MaxAcceleration: f(FieldType.NUMBER, 'MaxAcceleration', { default: 300, min: 5, max: 1000 }),
      MaxAngularAcceleration: f(FieldType.NUMBER, 'MaxAngularAcceleration', { default: 300, min: 5, max: 1000 }),
      DisableCellsExpansions: f(FieldType.CHECKBOX, 'DisableCellsExpansions'),
      ShipExplosionEffect: f(FieldType.REFERENCE, 'ShipExplosionEffect', { targetType: ItemType.VisualEffect }),
      ShipExplosionSound: f(FieldType.TEXT, 'ShipExplosionSound'),
      DroneExplosionEffect: f(FieldType.REFERENCE, 'DroneExplosionEffect', { targetType: ItemType.VisualEffect }),
      DroneExplosionSound: f(FieldType.TEXT, 'DroneExplosionSound'),
    }
  },

  [ItemType.GalaxySettings]: {
    title: 'Galaxy Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      AbandonedStarbaseFaction: f(FieldType.REFERENCE, 'AbandonedStarbaseFaction', { targetType: ItemType.Faction }),
      StartingShipBuilds: f(FieldType.TAG_LIST, 'StartingShipBuilds', { targetType: 8, fullWidth: true }),
      StartingInventory: f(FieldType.REFERENCE, 'StartingInventory', { targetType: 16 }),
      SupporterPackShip: f(FieldType.REFERENCE, 'SupporterPackShip', { targetType: 8 }),
      DefaultStarbaseBuild: f(FieldType.REFERENCE, 'DefaultStarbaseBuild', { targetType: 8 }),
      MaxEnemyShipsLevel: f(FieldType.NUMBER, 'MaxEnemyShipsLevel', { default: 300 }),
      EnemyLevel: f(FieldType.TEXT, 'EnemyLevel', { default: "MIN(3*distance/5 - 5, MaxEnemyShipsLevel)" }),
      ShipMinSpawnDistance: f(FieldType.TEXT, 'ShipMinSpawnDistance', { default: "IF(size == Destroyer, 5, size == Cruiser, 15, size == Battleship, 50, size == Titan, 100, 0)" }),
      CaptureStarbaseQuest: f(FieldType.REFERENCE, 'CaptureStarbaseQuest', { targetType: 15 }),
      SurvivalCombatRules: f(FieldType.REFERENCE, 'SurvivalCombatRules', { targetType: 30 }),
      StarbaseCombatRules: f(FieldType.REFERENCE, 'StarbaseCombatRules', { targetType: 30 }),
      FlagshipCombatRules: f(FieldType.REFERENCE, 'FlagshipCombatRules', { targetType: 30 }),
      ArenaCombatRules: f(FieldType.REFERENCE, 'ArenaCombatRules', { targetType: 30 }),
      ChallengeCombatRules: f(FieldType.REFERENCE, 'ChallengeCombatRules', { targetType: 30 }),
      QuickCombatRules: f(FieldType.REFERENCE, 'QuickCombatRules', { targetType: 30 }),
    }
  },

  [ItemType.DatabaseSettings]: {
    title: 'Database Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      DatabaseVersion: f(FieldType.NUMBER, 'DatabaseVersion', { default: 1 }),
      DatabaseVersionMinor: f(FieldType.NUMBER, 'DatabaseVersionMinor', { default: 7 }),
      ModName: f(FieldType.TEXT, 'ModName', { default: "" }),
      ModId: f(FieldType.TEXT, 'ModId', { default: "" }),
      ModVersion: f(FieldType.NUMBER, 'ModVersion', { default: 0 }),
      UnloadOriginalDatabase: f(FieldType.CHECKBOX, 'UnloadOriginalDatabase', { default: false }),
    }
  },

  [ItemType.DebugSettings]: {
    title: 'Debug Settings',
    fields: {
      EnableDebugConsole: f(FieldType.CHECKBOX, 'Enable Console'),
      Codes: f(FieldType.CHEAT_CODE_LIST, 'Cheat Codes')
    }
  },

  [ItemType.ExplorationSettings]: {
    title: 'Exploration Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      OutpostShip: f(FieldType.REFERENCE, 'OutpostShip', { targetType: 6, default: 101 }),
      TurretShip: f(FieldType.REFERENCE, 'TurretShip', { targetType: 6, default: 100 }),
      InfectedPlanetFaction: f(FieldType.REFERENCE, 'InfectedPlanetFaction', { targetType: ItemType.Faction, default: 16 }),
      HiveShipBuild: f(FieldType.REFERENCE, 'HiveShipBuild', { targetType: 8, default: 275 }),
      GasCloudDPS: f(FieldType.TEXT, 'GasCloudDPS', { default: "MIN(level*2,500)" }),
    }
  },

  [ItemType.ShipModSettings]: {
    title: 'Ship Modifications Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      RemoveWeaponSlotMod: f(FieldType.CHECKBOX, 'RemoveWeaponSlotMod', { default: false }),
      RemoveUnlimitedRespawnMod: f(FieldType.CHECKBOX, 'RemoveUnlimitedRespawnMod', { default: false }),
      RemoveEnergyRechargeCdMod: f(FieldType.CHECKBOX, 'RemoveEnergyRechargeCdMod', { default: true }),
      RemoveShieldRechargeCdMod: f(FieldType.CHECKBOX, 'RemoveShieldRechargeCdMod', { default: true }),
      RemoveBiggerSatellitesMod: f(FieldType.CHECKBOX, 'RemoveBiggerSatellitesMod', { default: true }),
      HeatDefenseValue: f(FieldType.NUMBER, 'HeatDefenseValue', { default: 0.5 }),
      KineticDefenseValue: f(FieldType.NUMBER, 'KineticDefenseValue', { default: 0.5 }),
      EnergyDefenseValue: f(FieldType.NUMBER, 'EnergyDefenseValue', { default: 0.5 }),
      RegenerationValue: f(FieldType.NUMBER, 'RegenerationValue', { default: 0.01 }),
      RegenerationArmor: f(FieldType.NUMBER, 'RegenerationArmor', { default: 0.85 }),
      WeightReduction: f(FieldType.NUMBER, 'WeightReduction', { default: 0.8 }),
      AttackReduction: f(FieldType.NUMBER, 'AttackReduction', { default: 0.2 }),
      EnergyReduction: f(FieldType.NUMBER, 'EnergyReduction', { default: 0.5 }),
      ShieldReduction: f(FieldType.NUMBER, 'ShieldReduction', { default: 0.5 }),
    }
  },

  [ItemType.SpecialEventSettings]: {
    title: 'Special Event Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      EnableXmasEvent: f(FieldType.CHECKBOX, 'EnableXmasEvent'),
      XmasDaysBefore: f(FieldType.NUMBER, 'XmasDaysBefore'),
      XmasDaysAfter: f(FieldType.NUMBER, 'XmasDaysAfter'),
      XmasQuest: f(FieldType.REFERENCE, 'XmasQuest', { targetType: ItemType.Quest }),
      XmasCombatRules: f(FieldType.REFERENCE, 'XmasCombatRules', { targetType: ItemType.CombatRules }),
      ConvertCreditsToSnowflakes: f(FieldType.TEXT, 'ConvertCreditsToSnowflakes', { default: "1 + credits/500" }),
      EnableEasterEvent: f(FieldType.CHECKBOX, 'EnableEasterEvent'),
      EasterDaysBefore: f(FieldType.NUMBER, 'EasterDaysBefore'),
      EasterDaysAfter: f(FieldType.NUMBER, 'EasterDaysAfter'),
      EasterQuest: f(FieldType.REFERENCE, 'EasterQuest', { targetType: ItemType.Quest }),
      EnableHalloweenEvent: f(FieldType.CHECKBOX, 'EnableHalloweenEvent'),
      HalloweenDaysBefore: f(FieldType.NUMBER, 'HalloweenDaysBefore'),
      HalloweenDaysAfter: f(FieldType.NUMBER, 'HalloweenDaysAfter'),
      HalloweenQuest: f(FieldType.REFERENCE, 'HalloweenQuest', { targetType: ItemType.Quest }),
    }
  },

  [ItemType.SkillSettings]: {
    title: 'Skill Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      BeatAllEnemiesFactionList: f(FieldType.TAG_LIST, 'Enemy Factions', { targetType: ItemType.Faction, fullWidth: true }),
      DisableExceedTheLimits: f(FieldType.CHECKBOX, 'Disable Exceed The Limits', { default: false }),
      FuelTankCapacity: f(FieldType.TEXT, 'FuelTankCapacity', { default: "BaseFuelCapacity + 50*level" }),
      AttackBonus: f(FieldType.TEXT, 'AttackBonus', { default: "0.1*level" }),
      DefenseBonus: f(FieldType.TEXT, 'DefenseBonus', { default: "0.1*level" }),
      ShieldStrengthBonus: f(FieldType.TEXT, 'ShieldStrengthBonus', { default: "0.1*level" }),
      ShieldRechargeBonus: f(FieldType.TEXT, 'ShieldRechargeBonus', { default: "0.1*level" }),
      ExperienceBonus: f(FieldType.TEXT, 'ExperienceBonus', { default: "0.1*level" }),
      FlightSpeed: f(FieldType.TEXT, 'FlightSpeed', { default: "BaseFlightSpeed + 0.4*level" }),
      FlightRange: f(FieldType.TEXT, 'FlightRange', { default: "BaseFlightRange + 0.09*level" }),
      ExplorationLootBonus: f(FieldType.TEXT, 'ExplorationLootBonus', { default: "0.1*level" }),
      HeatResistance: f(FieldType.TEXT, 'HeatResistance', { default: "0.1*level" }),
      KineticResistance: f(FieldType.TEXT, 'KineticResistance', { default: "0.1*level" }),
      EnergyResistance: f(FieldType.TEXT, 'EnergyResistance', { default: "0.1*level" }),
      MerchantPriceFactor: f(FieldType.TEXT, 'MerchantPriceFactor', { default: "1 - 0.05*level" }),
      CraftingPriceFactor: f(FieldType.TEXT, 'CraftingPriceFactor', { default: "1 - 0.05*level" }),
      CraftingLevelReduction: f(FieldType.TEXT, 'CraftingLevelReduction', { default: "5*level" }),
      MaxPlayerShipsLevel: f(FieldType.NUMBER, 'MaxPlayerShipsLevel', { default: 100 }),
      IncreasedLevelLimit: f(FieldType.NUMBER, 'IncreasedLevelLimit', { default: 200 }),
      BaseFuelCapacity: f(FieldType.NUMBER, 'BaseFuelCapacity', { default: 100 }),
      BaseFlightRange: f(FieldType.NUMBER, 'BaseFlightRange', { default: 1.5 }),
      BaseFlightSpeed: f(FieldType.NUMBER, 'BaseFlightSpeed', { default: 1.0 })
    }
  },

  [ItemType.CombatSettings]: {
    title: 'Combat Settings',
    fields: {
      DefaultCombatRules: f(FieldType.REFERENCE, 'Default Rules', { targetType: ItemType.CombatRules }),
      EnemyAI: f(FieldType.REFERENCE, 'Enemy AI', { targetType: ItemType.BehaviorTree }),
      AutopilotAI: f(FieldType.REFERENCE, 'Autopilot AI', { targetType: ItemType.BehaviorTree }),
      CloneAI: f(FieldType.REFERENCE, 'Clone AI', { targetType: ItemType.BehaviorTree }),
      DefensiveDroneAI: f(FieldType.REFERENCE, 'Defensive Drone AI', { targetType: ItemType.BehaviorTree }),
      OffensiveDroneAI: f(FieldType.REFERENCE, 'Offensive Drone AI', { targetType: ItemType.BehaviorTree }),
      StarbaseAI: f(FieldType.REFERENCE, 'Starbase AI', { targetType: ItemType.BehaviorTree })
    }
  },

  [ItemType.UiSettings]: {
    title: 'UI Settings',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      MainMenuBackgroundImage: f(FieldType.IMAGE, 'Main Menu Background'),
      WindowColor: f(FieldType.COLOR, 'Window Color'),
      ScrollBarColor: f(FieldType.COLOR, 'Scrollbar Color'),
      IconColor: f(FieldType.COLOR, 'Icon Color'),
      SelectionColor: f(FieldType.COLOR, 'Selection Color'),
      ButtonColor: f(FieldType.COLOR, 'Button Color'),
      ButtonFocusColor: f(FieldType.COLOR, 'Button Focus Color'),
      ButtonTextColor: f(FieldType.COLOR, 'Button Text Color'),
      ButtonIconColor: f(FieldType.COLOR, 'Button Icon Color'),
      PremiumButtonTextColor: f(FieldType.COLOR, 'Premium Button Text Color'),
      PremiumButtonIconColor: f(FieldType.COLOR, 'Premium Button Icon Color'),
      TextColor: f(FieldType.COLOR, 'Main Text Color'),
      ErrorTextColor: f(FieldType.COLOR, 'Error Text Color'),
      HeaderTextColor: f(FieldType.COLOR, 'Header Text Color'),
      PaleTextColor: f(FieldType.COLOR, 'Pale Text Color'),
      BrightTextColor: f(FieldType.COLOR, 'Bright Text Color'),
      BackgroundDark: f(FieldType.COLOR, 'Dark Background Color'),
      LowQualityItemColor: f(FieldType.COLOR, 'Quality: Low (Gray)'),
      CommonQualityItemColor: f(FieldType.COLOR, 'Quality: Common (Blue)'),
      MediumQualityItemColor: f(FieldType.COLOR, 'Quality: Medium (Green)'),
      HighQualityItemColor: f(FieldType.COLOR, 'Quality: High (Pink)'),
      PerfectQualityItemColor: f(FieldType.COLOR, 'Quality: Perfect (Gold)'),
      AvailableTechColor: f(FieldType.COLOR, 'Tech: Available'),
      UnavailableTechColor: f(FieldType.COLOR, 'Tech: Unavailable'),
      ObtainedTechColor: f(FieldType.COLOR, 'Tech: Obtained'),
      HiddenTechColor: f(FieldType.COLOR, 'Tech: Hidden'),
      CreditsColor: f(FieldType.COLOR, 'Credits Color'),
      StarsColor: f(FieldType.COLOR, 'Stars Color'),
      MoneyColor: f(FieldType.COLOR, 'Money Color'),
      FuelColor: f(FieldType.COLOR, 'Fuel Color'),
      TokensColor: f(FieldType.COLOR, 'Tokens Color'),
      NoCreditsText: f(FieldType.CHECKBOX, 'Hide Credits Text')
    }
  },

  [ItemType.FactionsSettings]: {
    title: 'Factions Settings',
    fields: {
      StarbaseMinDefense: f(FieldType.NUMBER, 'Min Starbase Defense'),
      DefenseLossPerEnemyDefeated: f(FieldType.NUMBER, 'Defense Loss Per Defeat'),
      StarbaseInitialDefense: f(FieldType.TEXT, 'Initial Defense (Expr)')
    }
  },

  [ItemType.MusicPlaylist]: {
    title: 'Music Playlist',
    fields: {
      Id: f(FieldType.NUMBER, 'ID', { locked: true }),
      MainMenuMusic: f(FieldType.MUSIC_LIST, 'Main Menu Music'),
      GalaxyMapMusic: f(FieldType.MUSIC_LIST, 'Galaxy Map Music'),
      CombatMusic: f(FieldType.MUSIC_LIST, 'Combat Music'),
      ExplorationMusic: f(FieldType.MUSIC_LIST, 'Exploration Music'),
    }
  },

  [ItemType.LocalizationSettings]: {
    title: 'Localization Settings',
    fields: {
      CorrosiveDamageText: f(FieldType.TEXT, 'Corrosive Damage Text'),
      CorrosiveDpsText: f(FieldType.TEXT, 'Corrosive DPS Text')
    }
  },

  [ItemType.WeaponSlots]: {
    title: 'Weapon Slots',
    fields: {
      DefaultSlotName: f(FieldType.TEXT, 'Slot Name', { hideInAdd: true }),
      DefaultSlotIcon: f(FieldType.IMAGE, 'Slot Icon', { hideInAdd: true }),
      Slots: f(FieldType.WEAPON_SLOTS, 'Slots List')
    }
  }
};

export const defaultSchema = {
  title: 'Unknown Item',
  fields: {
    Id: f(FieldType.NUMBER, 'ID'),
    ItemType: f(FieldType.NUMBER, 'Type ID', { locked: true })
  }
};  
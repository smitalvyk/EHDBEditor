import { useGameDatabase } from './useGameDatabase';

export function useValidator() {
  const { getItemsByType } = useGameDatabase();

  const runChecks = (config = { 
    checkMissingRefs: true, checkClamps: true, checkAiLogic: true, 
    fixClamps: true, fixStubs: true, fixEnums: false 
  }) => {
    const errors = [];
    
    const addError = (item, msg, fixInfo = null) => {
      const path = item.filePath || item.fullPath || item.path || item.name || '';
      const upperPath = path.toUpperCase();
      
      if (upperPath.includes('_FIX_NEEDED') || upperPath.includes('_BACKUP')) {
         return; 
      }
      
      errors.push({
        fileName: item.name,
        path: path, 
        itemType: item.typeId || 'Unknown',
        itemId: item.id !== undefined ? item.id : 'N/A', 
        message: msg,
        fixInfo: fixInfo, 
        itemRef: item 
      });
    };

    // Helper: Generates standard minimal JSON for missing references
    const generateStub = (typeId, id) => {
        const base = { ItemType: typeId, Id: id, Name: `_MissingRef_${typeId}_${id}` };
        if (typeId === 6) { base.ShipSettingsId = 1; base.Layout = "1"; }
        else if (typeId === 7) { base.Layout = "1"; }
        else if (typeId === 1) { base.ComponentStatsId = 1; base.Layout = "1"; base.Color = "#FFFFFF"; }
        else if (typeId === 11) { base.ArmorPoints = 100; }
        return base;
    };

    const addStubFix = (typeId, id) => {
        return config.fixStubs ? {
            type: 'create_stub',
            stubPath: `_FIX/Type${typeId}_${id}_Stub.json`,
            stubData: generateStub(typeId, id)
        } : null;
    };

    const addMissingIdFix = (obj, field, defaultVal = 1) => {
        return config.fixStubs ? {
            type: 'missing_id',
            applyFix: () => { obj[field] = defaultVal; }
        } : null;
    };

    const checkClamp = (item, obj, field, min, max, contextName = '') => {
      if (!config.checkClamps) return;
      if (obj && obj[field] !== undefined && (obj[field] < min || obj[field] > max)) {
        const clampedValue = Math.max(min, Math.min(max, obj[field]));
        const fix = config.fixClamps ? { type: 'clamp', applyFix: () => { obj[field] = clampedValue; } } : null;
        addError(item, `⚠️ Out of bounds: ${contextName ? contextName+'.' : ''}'${field}' (${obj[field]}) should be [${min} ... ${max}]. The game will limit (clamp) it!`, fix);
      }
    };

    const checkEnumFatal = (item, obj, field, min, max, contextStr) => {
        if (!obj) return;
        // Treat undefined as 0 for Unity serialization defaults
        const val = obj[field] !== undefined ? obj[field] : 0;
        
        if (val < min || val > max) {
            const fix = config.fixEnums ? { type: 'reset_enum', applyFix: () => { obj[field] = 0; } } : null;
            addError(item, `❌ Fatal: ${contextStr} has invalid '${field}' (${val}). Game will crash!`, fix);
        }
    };

    const validTypes = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 
      25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118
    ];

    const allItems = [];
    validTypes.forEach(typeId => {
       const items = getItemsByType(typeId);
       if (items && items.length > 0) {
          items.forEach(it => allItems.push({ ...it, typeId: typeId }));
       }
    });

    const componentsList = getItemsByType(1) || [];
    const ships = getItemsByType(6) || [];
    const satellites = getItemsByType(7) || [];
    const compStatsList = getItemsByType(11) || [];
    
    allItems.forEach(item => {
       const data = item.data;
       if (!data) return;

       // Type 8: ShipBuild
       if (item.typeId === 8 && config.checkMissingRefs) {
          if (data.ShipId === undefined || data.ShipId === null) {
              addError(item, `❌ Fatal: ObjectTemplate.Ship cannot be null or missing.`, addMissingIdFix(data, 'ShipId', 1));
          } else if (!ships.some(s => s.id === data.ShipId)) {
              addError(item, `❌ Fatal: ObjectTemplate.Ship (ShipId: ${data.ShipId}) not found in database.`, addStubFix(6, data.ShipId));
          }
          
          if (Array.isArray(data.Components)) {
             data.Components.forEach((comp, cIdx) => {
                if (comp.ComponentId === undefined || comp.ComponentId === null) {
                   const fix = config.fixStubs ? {
                      type: 'missing_id',
                      applyFix: () => { 
                         const originalComp = { ...comp };
                         for (let k in comp) delete comp[k]; 
                         comp.ComponentId = 0; 
                         for (let k in originalComp) {
                            if (k !== 'ComponentId') comp[k] = originalComp[k];
                         }
                      }
                   } : null;
                   addError(item, `⚠️ Missing Field: InstalledComponent[${cIdx}] lacks 'ComponentId'. The game assumes 0 ($Afterburner).`, fix);
                } 
                else if (comp.ComponentId !== 0 && !componentsList.some(c => c.id === comp.ComponentId)) {
                   addError(item, `❌ Fatal: InstalledComponent[${cIdx}] (ID: ${comp.ComponentId}) not found in Components database!`, addStubFix(1, comp.ComponentId));
                }
             });
          }
       }

       // Clamps for ShipBuild
       if (item.typeId === 8 && Array.isArray(data.Components)) {
          data.Components.forEach((comp, cIdx) => {
             checkClamp(item, comp, 'X', -32768, 32767, `Component[${cIdx}]`);
             checkClamp(item, comp, 'Y', -32768, 32767, `Component[${cIdx}]`);
             checkClamp(item, comp, 'BarrelId', -1, 255, `Component[${cIdx}]`);
             checkClamp(item, comp, 'Behaviour', 0, 10, `Component[${cIdx}]`);
             checkClamp(item, comp, 'KeyBinding', -10, 10, `Component[${cIdx}]`);
          });
       }

       // Type 9: SatelliteBuild
       if (item.typeId === 9 && config.checkMissingRefs) {
          if (data.SatelliteId === undefined || data.SatelliteId === null) {
              addError(item, `❌ Fatal: ObjectTemplate.Satellite cannot be null or missing.`, addMissingIdFix(data, 'SatelliteId', 1));
          } else if (!satellites.some(s => s.id === data.SatelliteId)) {
              addError(item, `❌ Fatal: ObjectTemplate.Satellite (SatelliteId: ${data.SatelliteId}) not found in database.`, addStubFix(7, data.SatelliteId));
          }
       }

       // Type 1: Component
       if (item.typeId === 1) {
           if (config.checkMissingRefs) {
               if (data.ComponentStatsId === undefined || data.ComponentStatsId === null || data.ComponentStatsId === 0) {
                   addError(item, `❌ Fatal: Component must have a valid ComponentStatsId!`, addMissingIdFix(data, 'ComponentStatsId', 1));
               } else if (!compStatsList.some(s => s.id === data.ComponentStatsId)) {
                   addError(item, `❌ Fatal: ComponentStatsId (${data.ComponentStatsId}) not found in database (Type 11)!`, addStubFix(11, data.ComponentStatsId));
               }
           }
           checkClamp(item, data, 'Level', 0, 2147483647, 'Component');
       }

       // Type 10: Technology
       if (item.typeId === 10) {
          checkEnumFatal(item, data, 'Type', 0, 2, 'Technology');
          
          if (config.checkMissingRefs) {
             const techType = data.Type !== undefined ? data.Type : 0;
             if (techType >= 0 && techType <= 2) {
                 let targetDb = techType === 1 ? ships : techType === 2 ? satellites : componentsList;
                 let targetTypeId = techType === 1 ? 6 : techType === 2 ? 7 : 1;
                 
                 if (data.ItemId === undefined || data.ItemId === null) {
                     addError(item, `❌ Fatal: Technology ItemId is missing.`, addMissingIdFix(data, 'ItemId', 1));
                 } else if (!targetDb.some(s => s.id === data.ItemId)) {
                     addError(item, `❌ Fatal: Technology ItemId (${data.ItemId}) not found in database.`, addStubFix(targetTypeId, data.ItemId));
                 }
             }
          }
       }

       // Clamps and general limits
       if (Array.isArray(data.Engines)) {
          data.Engines.forEach((engine, eIdx) => checkClamp(item, engine, 'Size', 0, 1, `Engine[${eIdx}]`));
       }

       if (Array.isArray(data.Barrels)) {
          data.Barrels.forEach((barrel, bIdx) => {
             checkClamp(item, barrel, 'Rotation', -360, 360, `Barrel[${bIdx}]`);
             checkClamp(item, barrel, 'Offset', 0, 1, `Barrel[${bIdx}]`);
             checkClamp(item, barrel, 'AutoAimingArc', 0, 360, `Barrel[${bIdx}]`);
             checkClamp(item, barrel, 'RotationSpeed', 0, 1000, `Barrel[${bIdx}]`);
             checkClamp(item, barrel, 'Size', 0, 100, `Barrel[${bIdx}]`);
          });
       }

       const checkRestrictions = (res) => {
         if (!res) return;
         checkClamp(item, res, 'MaxComponentAmount', 0, 2147483647, 'Restrictions');
       };
       if (data.MaxComponentAmount !== undefined && data.NotForOrganicShips !== undefined) checkRestrictions(data);
       if (data.Restrictions) checkRestrictions(data.Restrictions);

       if (data.Features) {
          checkClamp(item, data.Features, 'EnergyResistance', -100, 100, 'Features');
          checkClamp(item, data.Features, 'KineticResistance', -100, 100, 'Features');
          checkClamp(item, data.Features, 'HeatResistance', -100, 100, 'Features');
          checkClamp(item, data.Features, 'ShipWeightBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'EquipmentWeightBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'VelocityBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'TurnRateBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'ArmorBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'ShieldBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'EnergyBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'DroneBuildSpeedBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'DroneAttackBonus', -1, 100, 'Features');
          checkClamp(item, data.Features, 'DroneDefenseBonus', -1, 100, 'Features');
       }

       if (data.ColliderTolerance !== undefined) checkClamp(item, data, 'ColliderTolerance', 0, 1, 'Ship');
       if (data.ModelScale !== undefined) checkClamp(item, data, 'ModelScale', 0.1, 100, 'Model');

       if (data.BaseArmorPoints !== undefined && data.ArmorPointsPerCell !== undefined) {
          checkClamp(item, data, 'DefaultWeightPerCell', 1, 1000000, 'ShipSettings');
          checkClamp(item, data, 'MinimumWeightPerCell', 1, 1000000, 'ShipSettings');
          checkClamp(item, data, 'BaseArmorPoints', 0, 1000000, 'ShipSettings');
          checkClamp(item, data, 'ArmorPointsPerCell', 0, 1000000, 'ShipSettings');
          checkClamp(item, data, 'ArmorRepairCooldown', 0, 1000, 'ShipSettings');
          checkClamp(item, data, 'BaseEnergyPoints', 0, 1000000, 'ShipSettings');
          checkClamp(item, data, 'BaseEnergyRechargeRate', 0, 1000000, 'ShipSettings');
          checkClamp(item, data, 'EnergyRechargeCooldown', 0, 1000, 'ShipSettings');
          checkClamp(item, data, 'BaseShieldRechargeRate', 0, 1000000, 'ShipSettings');
          checkClamp(item, data, 'ShieldRechargeCooldown', 0, 1000, 'ShipSettings');
          checkClamp(item, data, 'BaseDroneReconstructionSpeed', 0, 100, 'ShipSettings');
          checkClamp(item, data, 'ShieldCorrosiveResistance', 0, 1, 'ShipSettings');
          checkClamp(item, data, 'MaxVelocity', 1, 1000, 'ShipSettings');
          checkClamp(item, data, 'MaxAngularVelocity', 1, 1000, 'ShipSettings');
          checkClamp(item, data, 'MaxAcceleration', 1, 1000, 'ShipSettings');
          checkClamp(item, data, 'MaxAngularAcceleration', 1, 1000, 'ShipSettings');
       }

       if (data.HeatDefenseValue !== undefined && data.WeightReduction !== undefined) {
          checkClamp(item, data, 'HeatDefenseValue', 0, 10, 'ShipModSettings');
          checkClamp(item, data, 'KineticDefenseValue', 0, 10, 'ShipModSettings');
          checkClamp(item, data, 'EnergyDefenseValue', 0, 10, 'ShipModSettings');
          checkClamp(item, data, 'RegenerationValue', 0, 1, 'ShipModSettings');
          checkClamp(item, data, 'RegenerationArmor', 0, 1, 'ShipModSettings');
          checkClamp(item, data, 'WeightReduction', 0, 1, 'ShipModSettings');
          checkClamp(item, data, 'AttackReduction', 0, 1, 'ShipModSettings');
          checkClamp(item, data, 'EnergyReduction', 0, 1, 'ShipModSettings');
          checkClamp(item, data, 'ShieldReduction', 0, 1, 'ShipModSettings');
       }

       if (item.typeId === 11) { // ComponentStats
          checkClamp(item, data, 'ArmorPoints', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'ArmorRepairRate', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'ArmorRepairCooldownModifier', -1, 1, 'Stats');
          checkClamp(item, data, 'EnergyPoints', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'EnergyRechargeRate', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'EnergyRechargeCooldownModifier', -5, 5, 'Stats');
          checkClamp(item, data, 'ShieldPoints', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'ShieldRechargeRate', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'ShieldRechargeCooldownModifier', -5, 5, 'Stats');
          checkClamp(item, data, 'Weight', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'RammingDamage', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'EnergyAbsorption', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'KineticResistance', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'EnergyResistance', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'ThermalResistance', -1000000, 1000000, 'Stats');
          checkClamp(item, data, 'EnginePower', 0, 2000, 'Stats');
          checkClamp(item, data, 'TurnRate', 0, 2000, 'Stats');
          checkClamp(item, data, 'DroneRangeModifier', -50, 50, 'Stats');
          checkClamp(item, data, 'DroneDamageModifier', -50, 50, 'Stats');
          checkClamp(item, data, 'DroneDefenseModifier', -50, 50, 'Stats');
          checkClamp(item, data, 'DroneSpeedModifier', -50, 50, 'Stats');
          checkClamp(item, data, 'DronesBuiltPerSecond', 0, 100, 'Stats');
          checkClamp(item, data, 'DroneBuildTimeModifier', 0, 100, 'Stats');
          checkClamp(item, data, 'WeaponFireRateModifier', -100, 100, 'Stats');
          checkClamp(item, data, 'WeaponDamageModifier', -100, 100, 'Stats');
          checkClamp(item, data, 'WeaponRangeModifier', -100, 100, 'Stats');
          checkClamp(item, data, 'WeaponEnergyCostModifier', -100, 100, 'Stats');
          checkClamp(item, data, 'AutoAimingArc', 0, 360, 'Stats');
          checkClamp(item, data, 'TurretTurnSpeed', -1000, 1000, 'Stats');
       }

       if (data.DeviceClass !== undefined && data.EnergyConsumption !== undefined && data.PassiveEnergyConsumption !== undefined) {
          checkClamp(item, data, 'EnergyConsumption', 0, 1e9, 'Device');
          checkClamp(item, data, 'PassiveEnergyConsumption', 0, 1e9, 'Device');
          checkClamp(item, data, 'Power', -3.402823e38, 3.402823e38, 'Device');
          checkClamp(item, data, 'Range', 0, 1000, 'Device');
          checkClamp(item, data, 'Size', 0, 1000, 'Device');
          checkClamp(item, data, 'Cooldown', 0, 1000, 'Device');
          checkClamp(item, data, 'Lifetime', 0, 1000, 'Device');
       }

       if (data.Weapon !== undefined) {
          checkClamp(item, data.Weapon, 'FireRate', 0, 100, 'Weapon');
          checkClamp(item, data.Weapon, 'Spread', 0, 360, 'Weapon');
          checkClamp(item, data.Weapon, 'Magazine', 0, 999999999, 'Weapon');
          checkClamp(item, data.Weapon, 'EffectSize', 0, 100, 'Weapon');
       }

       if (data.Capacity !== undefined && data.BuildExtraCycles !== undefined) {
          checkClamp(item, data, 'EnergyConsumption', 0, 1e9, 'DroneBay');
          checkClamp(item, data, 'PassiveEnergyConsumption', 0, 1e9, 'DroneBay');
          checkClamp(item, data, 'Range', 1, 1000, 'DroneBay');
          checkClamp(item, data, 'DamageMultiplier', 0.01, 1000, 'DroneBay');
          checkClamp(item, data, 'DefenseMultiplier', 0.01, 1000, 'DroneBay');
          checkClamp(item, data, 'SpeedMultiplier', 0.01, 1000, 'DroneBay');
          checkClamp(item, data, 'BuildExtraCycles', 0, 100, 'DroneBay');
          checkClamp(item, data, 'Capacity', 1, 1000, 'DroneBay');
       }

       if (data.DatabaseVersion !== undefined && data.ModId !== undefined) {
          checkClamp(item, data, 'DatabaseVersion', 1, 2147483647, 'DatabaseSettings');
          checkClamp(item, data, 'DatabaseVersionMinor', 0, 2147483647, 'DatabaseSettings');
          checkClamp(item, data, 'ModVersion', -2147483648, 2147483647, 'DatabaseSettings');
       }

       if (data.Code !== undefined && data.Loot !== undefined) {
          checkClamp(item, data, 'Code', 0, 999999, 'DebugCode');
       }

       if (data.Relations !== undefined && data.AvatarIcon !== undefined) {
          checkClamp(item, data, 'Relations', -100, 100, 'Character');
       }

       if (data.BattleMapSize !== undefined && data.TimeLimit !== undefined) {
          checkClamp(item, data, 'BattleMapSize', 50, 2147483647, 'CombatRules');
       }

       if (data.Shape !== undefined && data.Margins !== undefined) {
          checkClamp(item, data, 'Size', 0.01, 100, 'BulletPrefab');
          checkClamp(item, data, 'Margins', 0, 1, 'BulletPrefab');
          checkClamp(item, data, 'Deformation', -100, 100, 'BulletPrefab');
       }

       if (Array.isArray(data.Elements)) {
          data.Elements.forEach((el, eIdx) => {
             checkClamp(item, el, 'Quantity', 1, 100, `Element[${eIdx}]`);
             checkClamp(item, el, 'Size', 0.01, 10, `Element[${eIdx}]`);
             checkClamp(item, el, 'GrowthRate', -1, 100, `Element[${eIdx}]`);
             checkClamp(item, el, 'TurnRate', -1000, 1000, `Element[${eIdx}]`);
             checkClamp(item, el, 'StartTime', 0, 1000, `Element[${eIdx}]`);
             checkClamp(item, el, 'Lifetime', 0, 1000, `Element[${eIdx}]`);
             checkClamp(item, el, 'ParticleSize', 0.001, 100, `Element[${eIdx}]`);
             checkClamp(item, el, 'Rotation', 0, 360, `Element[${eIdx}]`);
          });
       }

       if (item.typeId === 4) { // AmmunitionObsolete
          checkClamp(item, data, 'Impulse', 0, 10, 'AmmunitionObsolete');
          checkClamp(item, data, 'Recoil', 0, 10, 'AmmunitionObsolete');
          checkClamp(item, data, 'Size', 0, 1000, 'AmmunitionObsolete');
          checkClamp(item, data, 'AreaOfEffect', 0, 1000, 'AmmunitionObsolete');
          checkClamp(item, data, 'Damage', 0, 1e9, 'AmmunitionObsolete');
          checkClamp(item, data, 'Range', 0, 1000, 'AmmunitionObsolete');
          checkClamp(item, data, 'Velocity', 0, 1000, 'AmmunitionObsolete');
          checkClamp(item, data, 'LifeTime', 0, 1e9, 'AmmunitionObsolete');
          checkClamp(item, data, 'HitPoints', 0, 999999999, 'AmmunitionObsolete');
          checkClamp(item, data, 'EnergyCost', 0, 1e9, 'AmmunitionObsolete');
       }

       if (data.Body !== undefined) {
          checkClamp(item, data.Body, 'Size', 0, 1000, 'BulletBody');
          checkClamp(item, data.Body, 'Length', 0, 1000, 'BulletBody');
          checkClamp(item, data.Body, 'Velocity', 0, 1000, 'BulletBody');
          checkClamp(item, data.Body, 'ParentVelocityEffect', -1000, 1000, 'BulletBody');
          checkClamp(item, data.Body, 'Range', 0, 1e9, 'BulletBody');
          checkClamp(item, data.Body, 'Lifetime', 0, 1e9, 'BulletBody');
          checkClamp(item, data.Body, 'Weight', 0, 1e9, 'BulletBody');
          checkClamp(item, data.Body, 'HitPoints', 0, 999999999, 'BulletBody');
          checkClamp(item, data.Body, 'EnergyCost', 0, 1e9, 'BulletBody');
       }

       if (data.Controller !== undefined) {
          checkEnumFatal(item, data.Controller, 'Type', 0, 6, 'BulletController');
          checkClamp(item, data.Controller, 'StartingVelocityModifier', 0, 1000, 'Controller');
          checkClamp(item, data.Controller, 'Lifetime', 0, 3.4e38, 'Controller');
       }

       if (Array.isArray(data.Triggers)) {
          data.Triggers.forEach((t, i) => {
             checkEnumFatal(item, t, 'EffectType', 0, 5, `BulletTrigger[${i}]`);
             checkClamp(item, t, 'Cooldown', 0, 1000, `Trigger[${i}]`);
             checkClamp(item, t, 'Size', 0, 100, `Trigger[${i}]`);
             checkClamp(item, t, 'Lifetime', 0, 1000, `Trigger[${i}]`);
             checkClamp(item, t, 'Quantity', 0, 1000, `Trigger[${i}]`);
             checkClamp(item, t, 'RandomFactor', 0, 1, `Trigger[${i}]`);
             checkClamp(item, t, 'PowerMultiplier', 0, 3.4e38, `Trigger[${i}]`);
             checkClamp(item, t, 'MaxNestingLevel', 0, 100, `Trigger[${i}]`);
          });
       }

       if (data.MaxInstallableComponents !== undefined) {
          checkClamp(item, data, 'MaxInstallableComponents', 1, 2147483647, 'ComponentGroupTag');
       }

       if (data.HomeStarDistance !== undefined && data.NoTerritories !== undefined) {
          checkClamp(item, data, 'HomeStarDistance', 0, 5000, 'Faction');
          checkClamp(item, data, 'HomeStarDistanceMax', 0, 5000, 'Faction');
          checkClamp(item, data, 'WanderingShipsDistance', 0, 5000, 'Faction');
          checkClamp(item, data, 'WanderingShipsDistanceMax', 0, 5000, 'Faction');
       }

       if (data.StarbaseMinDefense !== undefined && data.DefenseLossPerEnemyDefeated !== undefined) {
          checkClamp(item, data, 'StarbaseMinDefense', 1, 2147483647, 'FactionsSettings');
          checkClamp(item, data, 'DefenseLossPerEnemyDefeated', 0, 2147483647, 'FactionsSettings');
       }

       if (data.LevelBonus !== undefined && data.NoRandomShips !== undefined) {
          checkClamp(item, data, 'LevelBonus', -10000, 10000, 'Fleet');
       }

       if (data.Type !== undefined && (data.ImageScale !== undefined || data.JointImageScale !== undefined || data.Thickness !== undefined)) {
          checkEnumFatal(item, data, 'Type', 0, 3, 'GameObjectPrefab');
          checkClamp(item, data, 'ImageScale', 0, 10, 'GameObjectPrefab');
          checkClamp(item, data, 'Thickness', 0, 1, 'GameObjectPrefab');
          checkClamp(item, data, 'AspectRatio', 0, 100, 'GameObjectPrefab');
          checkClamp(item, data, 'JointImageScale', 0, 10, 'GameObjectPrefab');
          checkClamp(item, data, 'JointImageOffset', -1, 1, 'GameObjectPrefab');
          checkClamp(item, data, 'BoneLength', 0, 1, 'GameObjectPrefab');
          checkClamp(item, data, 'JointOffset', 0, 1, 'GameObjectPrefab');
          checkClamp(item, data, 'HeadOffset', -1, 1, 'GameObjectPrefab');
          checkClamp(item, data, 'MaxRotation', 0, 180, 'GameObjectPrefab');
          checkClamp(item, data, 'MaxHeadRotation', 0, 180, 'GameObjectPrefab');
       }

       const checkImpactEffect = (ie) => {
         if(!ie) return;
         checkClamp(item, ie, 'Power', 0, 1e9, 'ImpactEffect');
         checkClamp(item, ie, 'Factor', 0, 1e9, 'ImpactEffect');
       };
       if (data.DamageType !== undefined && data.Power !== undefined && data.Factor !== undefined && data.Type !== undefined) {
          checkImpactEffect(data);
       }
       if (Array.isArray(data.Effects)) {
          data.Effects.forEach(checkImpactEffect);
       }

       if (data.MaxEnemyShipsLevel !== undefined && data.StartingShipBuilds !== undefined) {
          checkClamp(item, data, 'MaxEnemyShipsLevel', 0, 500, 'GalaxySettings');
       }

       if (item.typeId === 20) { // QuestItem
          checkClamp(item, data, 'Price', 0, 999999999, 'QuestItem');
       }

       if (item.typeId === 15) { // Quest
          checkClamp(item, data, 'Weight', 0, 1000, 'Quest');
          checkClamp(item, data, 'Level', 0, 1000, 'Quest');
       }
       if (data.Origin) {
          checkClamp(item, data.Origin, 'MinDistance', 0, 9999, 'Quest.Origin');
          checkClamp(item, data.Origin, 'MaxDistance', 0, 9999, 'Quest.Origin');
          checkClamp(item, data.Origin, 'MinRelations', -100, 100, 'Quest.Origin');
          checkClamp(item, data.Origin, 'MaxRelations', -100, 100, 'Quest.Origin');
       }

       if (Array.isArray(data.Nodes)) {
          data.Nodes.forEach((node, nIdx) => {
             checkClamp(item, node, 'DefaultTransition', 1, 999999, `Node[${nIdx}]`);
             checkClamp(item, node, 'Transition', 1, 999999, `Node[${nIdx}]`);

             if (Array.isArray(node.Actions)) {
                node.Actions.forEach((act, aIdx) => checkClamp(item, act, 'TargetNode', 1, 999999, `Node[${nIdx}].Action[${aIdx}]`));
             }
             if (Array.isArray(node.Transitions)) {
                node.Transitions.forEach((tr, tIdx) => {
                   checkClamp(item, tr, 'TargetNode', 1, 999999, `Node[${nIdx}].Transition[${tIdx}]`);
                   checkClamp(item, tr, 'Weight', 0, 1000, `Node[${nIdx}].Transition[${tIdx}]`);
                });
             }
          });
       }

       const checkRequirement = (req, pathStr) => {
          if (!req) return;
          if (req.MinValue !== undefined) checkClamp(item, req, 'MinValue', 0, 999999, pathStr);
          if (req.MaxValue !== undefined) checkClamp(item, req, 'MaxValue', 0, 999999, pathStr);
          if (Array.isArray(req.Requirements)) {
             req.Requirements.forEach((r, idx) => checkRequirement(r, `${pathStr}.Requirements[${idx}]`));
          }
       };
       if (data.Requirement) checkRequirement(data.Requirement, 'Requirement');
       if (data.Actions) data.Actions.forEach((act, aIdx) => checkRequirement(act.Requirement, `Action[${aIdx}].Requirement`));
       if (data.Transitions) data.Transitions.forEach((tr, tIdx) => checkRequirement(tr.Requirement, `Transition[${tIdx}].Requirement`));
       if (Array.isArray(data.Nodes)) {
          data.Nodes.forEach((node, nIdx) => {
             if (node.Actions) node.Actions.forEach((act, aIdx) => checkRequirement(act.Requirement, `Node[${nIdx}].Action[${aIdx}].Requirement`));
             if (node.Transitions) node.Transitions.forEach((tr, tIdx) => checkRequirement(tr.Requirement, `Node[${nIdx}].Transition[${tIdx}].Requirement`));
          });
       }

       const checkLoot = (lootObj, pathName) => {
          if (!lootObj || typeof lootObj !== 'object') return;
          checkClamp(item, lootObj, 'MinAmount', 0, 999999999, pathName);
          checkClamp(item, lootObj, 'MaxAmount', 0, 999999999, pathName);

          if (Array.isArray(lootObj.Items)) {
             lootObj.Items.forEach((li, lIdx) => checkLoot(li.Loot, `${pathName}.Items[${lIdx}]`));
          }
       };
       if (data.Loot) checkLoot(data.Loot, 'Loot');
       if (data.Inventory) checkLoot(data.Inventory, 'Inventory'); 

       if (item.typeId === 32) { // StatUpgradeTemplate
          checkClamp(item, data, 'MaxLevel', 1, 10000, 'StatUpgradeTemplate');
       }

       if (data.EnableXmasEvent !== undefined || data.XmasDaysBefore !== undefined) {
          checkClamp(item, data, 'XmasDaysBefore', 0, 30, 'SpecialEventSettings');
          checkClamp(item, data, 'XmasDaysAfter', 0, 30, 'SpecialEventSettings');
          checkClamp(item, data, 'EasterDaysBefore', 0, 30, 'SpecialEventSettings');
          checkClamp(item, data, 'EasterDaysAfter', 0, 30, 'SpecialEventSettings');
          checkClamp(item, data, 'HalloweenDaysBefore', 0, 30, 'SpecialEventSettings');
          checkClamp(item, data, 'HalloweenDaysAfter', 0, 30, 'SpecialEventSettings');
       }

       if (data.Ship !== undefined && data.Value !== undefined) {
          checkClamp(item, data, 'Value', 0, 2147483647, 'ShipToValue');
       }

       // AI Behavior nodes
       const checkBehaviorNodes = (obj) => {
          if (!config.checkAiLogic) return;
          
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
             obj.forEach(checkBehaviorNodes);
             return;
          }

          if (Array.isArray(obj.Requirements)) {
             obj.Requirements.forEach((req) => {
                checkEnumFatal(item, req, 'Type', 0, 102, 'BehaviorNodeRequirement');
                checkBehaviorNodes(req); 
             });
          }

          if (obj.Type !== undefined && (obj.Requirement !== undefined || obj.Nodes !== undefined || obj.Node !== undefined)) {
             checkEnumFatal(item, obj, 'Type', 0, 310, 'BehaviorTreeNode');
             checkClamp(item, obj, 'Cooldown', 0, 3.4e38, `AI Node (Type ${obj.Type})`);
             
             if ([14, 22, 23, 28, 35, 40, 47, 61, 68, 71, 72].includes(obj.Type)) {
                checkClamp(item, obj, 'MinValue', 0, 1, `AI Node (Type ${obj.Type})`);
                checkClamp(item, obj, 'MaxValue', 0, 1, `AI Node (Type ${obj.Type})`);
             } else {
                checkClamp(item, obj, 'MinValue', 0, 3.4e38, `AI Node (Type ${obj.Type})`);
                checkClamp(item, obj, 'MaxValue', 0, 3.4e38, `AI Node (Type ${obj.Type})`);
             }
          }

          if (Array.isArray(obj.Nodes)) obj.Nodes.forEach(checkBehaviorNodes);
          if (obj.Node) checkBehaviorNodes(obj.Node);
          if (obj.Requirement) checkBehaviorNodes(obj.Requirement);
          if (obj.RootNode) checkBehaviorNodes(obj.RootNode);
       };
       
       if (item.typeId === 28 && data.RootNode) checkBehaviorNodes(data.RootNode);
       if (data.CustomAI) checkBehaviorNodes(data.CustomAI);
       if (data.DefensiveDroneAI) checkBehaviorNodes(data.DefensiveDroneAI);
       if (data.OffensiveDroneAI) checkBehaviorNodes(data.OffensiveDroneAI);
       if (data.EnemyAI) checkBehaviorNodes(data.EnemyAI);
       if (data.AutopilotAI) checkBehaviorNodes(data.AutopilotAI);
       if (data.CloneAI) checkBehaviorNodes(data.CloneAI);
       if (data.StarbaseAI) checkBehaviorNodes(data.StarbaseAI);
    });

    return errors;
  };

  return { runChecks };
}
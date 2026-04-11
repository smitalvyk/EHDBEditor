<script setup>
import { computed } from 'vue';
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';

const props = defineProps({
  modelValue: { type: [Object, Array], required: true },
  mode: { type: String, required: true } // 'body', 'controller', 'triggers', 'effects'
});

const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();

// === COMMON METHODS ===
const toPickerColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  if (hex.length > 7) return '#' + hex.substring(hex.length - 6);
  return hex;
};

// For Body and Controller (Objects)
const updateObjField = (field, value) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
};

// For Triggers and Effects (Arrays)
const updateListElement = (index, field, value) => {
  const newArray = [...props.modelValue];
  newArray[index] = { ...newArray[index], [field]: value };
  emit('update:modelValue', newArray);
};

const removeListElement = (index) => {
  const newArray = [...props.modelValue];
  newArray.splice(index, 1);
  emit('update:modelValue', newArray);
};

// Adding elements to lists
const addTrigger = () => {
  const newArray = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  newArray.push({
    Condition: 1, // Created
    EffectType: 0, // PlaySfx
    Cooldown: 0
  });
  emit('update:modelValue', newArray);
};

const addEffect = () => {
  const newArray = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  newArray.push({
    Type: 0, // Damage
    DamageType: 0, // Impact (If DamageType is string: "Impact", if ID: 0)
    Power: 10,
    Factor: 1
  });
  emit('update:modelValue', newArray);
};

// === VISIBILITY COMPUTATIONS FOR TRIGGERS ===
const isTrigSfx = (type) => [0, 1].includes(type); // PlaySfx, SpawnStaticSfx
const isTrigBullet = (type) => type === 2; // SpawnBullet
const isTrigGravity = (type) => type === 3; // GravityField
const isTrigPlaySfx = (type) => type === 0;

</script>

<template>
  <div class="ammo-container">
    
    <div v-if="mode === 'body'" class="ve-item single-block" style="border-left-color: #5555FF;">
      <div class="ve-header"><span class="ve-index">Body Settings</span></div>
      <div class="ve-grid">
        <div class="field-row"><label>Size</label><input type="number" :value="modelValue.Size" @input="e => updateObjField('Size', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>Length</label><input type="number" :value="modelValue.Length" @input="e => updateObjField('Length', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>Velocity</label><input type="number" :value="modelValue.Velocity" @input="e => updateObjField('Velocity', parseFloat(e.target.value))" class="win-input" step="1"></div>
        <div class="field-row"><label>P.Vel.Effect</label><input type="number" :value="modelValue.ParentVelocityEffect" @input="e => updateObjField('ParentVelocityEffect', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>Range</label><input type="number" :value="modelValue.Range" @input="e => updateObjField('Range', parseFloat(e.target.value))" class="win-input" step="1"></div>
        <div class="field-row"><label>Lifetime</label><input type="number" :value="modelValue.Lifetime" @input="e => updateObjField('Lifetime', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>Weight</label><input type="number" :value="modelValue.Weight" @input="e => updateObjField('Weight', parseFloat(e.target.value))" class="win-input" step="1"></div>
        <div class="field-row"><label>HitPoints</label><input type="number" :value="modelValue.HitPoints" @input="e => updateObjField('HitPoints', parseInt(e.target.value))" class="win-input"></div>
        <div class="field-row"><label>EnergyCost</label><input type="number" :value="modelValue.EnergyCost" @input="e => updateObjField('EnergyCost', parseFloat(e.target.value))" class="win-input" step="1"></div>
        
        <div class="field-row full-row">
          <label>BulletPrefab</label>
          <select :value="modelValue.BulletPrefab" @change="e => updateObjField('BulletPrefab', Number(e.target.value))" class="win-input">
            <option :value="0">[NONE]</option>
            <option v-for="bp in getItemsByType(ItemType.BulletPrefab)" :key="bp.id" :value="bp.id">[ID: {{ bp.id }}] {{ bp.name }}</option>
          </select>
        </div>

        <div class="field-row">
          <label>Color</label>
          <div class="color-wrap">
             <input type="color" :value="toPickerColor(modelValue.Color)" @input="e => updateObjField('Color', e.target.value)" class="color-picker">
             <input type="text" :value="modelValue.Color" @input="e => updateObjField('Color', e.target.value)" class="win-input small-text">
          </div>
        </div>

        <div class="field-row"><label>AiBehavior</label>
          <select :value="modelValue.AiBulletBehavior" @change="e => updateObjField('AiBulletBehavior', Number(e.target.value))" class="win-input">
            <option v-for="opt in SelectOptions.AiBulletBehaviorList" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </div>

        <div class="field-row check-row"><label>AttachToParent</label><input type="checkbox" :checked="modelValue.AttachedToParent" @change="e => updateObjField('AttachedToParent', e.target.checked)"></div>
        <div class="field-row check-row"><label>Disarmable</label><input type="checkbox" :checked="modelValue.CanBeDisarmed" @change="e => updateObjField('CanBeDisarmed', e.target.checked)"></div>
        <div class="field-row check-row"><label>FriendlyFire</label><input type="checkbox" :checked="modelValue.FriendlyFire" @change="e => updateObjField('FriendlyFire', e.target.checked)"></div>
        <div class="field-row check-row"><label>DetonateOnDie</label><input type="checkbox" :checked="modelValue.DetonateWhenDestroyed" @change="e => updateObjField('DetonateWhenDestroyed', e.target.checked)"></div>
      </div>
    </div>

    <div v-else-if="mode === 'controller'" class="ve-item single-block" style="border-left-color: #00FFFF;">
      <div class="ve-header">
        <span class="ve-index">Controller Type</span>
        <select :value="modelValue.Type" @change="e => updateObjField('Type', Number(e.target.value))" class="win-input type-select">
          <option v-for="opt in SelectOptions.BulletControllerTypeList" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
      </div>

      <div class="ve-grid">
        <template v-if="modelValue.Type === 1"> <div class="field-row"><label>StartVelMod</label><input type="number" :value="modelValue.StartingVelocityModifier" @input="e => updateObjField('StartingVelocityModifier', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
          <div class="field-row check-row"><label>IgnoreRot</label><input type="checkbox" :checked="modelValue.IgnoreRotation" @change="e => updateObjField('IgnoreRotation', e.target.checked)"></div>
          <div class="field-row check-row"><label>SmartAim</label><input type="checkbox" :checked="modelValue.SmartAim" @change="e => updateObjField('SmartAim', e.target.checked)"></div>
        </template>
        
        <template v-else-if="modelValue.Type === 6"> <div class="field-row"><label>MineLifetime</label><input type="number" :value="modelValue.Lifetime" @input="e => updateObjField('Lifetime', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        </template>
        
        <template v-else-if="modelValue.Type === 3"> <div class="field-row full-row"><label>Expr X</label><input type="text" :value="modelValue.X" @input="e => updateObjField('X', e.target.value)" class="win-input" placeholder="e.g., t * 5"></div>
          <div class="field-row full-row"><label>Expr Y</label><input type="text" :value="modelValue.Y" @input="e => updateObjField('Y', e.target.value)" class="win-input"></div>
          <div class="field-row full-row"><label>Expr Rot</label><input type="text" :value="modelValue.Rotation" @input="e => updateObjField('Rotation', e.target.value)" class="win-input"></div>
          <div class="field-row full-row"><label>Expr Size</label><input type="text" :value="modelValue.Size" @input="e => updateObjField('Size', e.target.value)" class="win-input"></div>
          <div class="field-row full-row"><label>Expr Length</label><input type="text" :value="modelValue.Length" @input="e => updateObjField('Length', e.target.value)" class="win-input"></div>
        </template>
      </div>
    </div>

    <div v-else-if="mode === 'triggers'">
      <div v-for="(trig, idx) in modelValue" :key="idx" class="ve-item" style="border-left-color: #FFAA00;">
        <div class="ve-header">
          <span class="ve-index">Trig #{{ idx + 1 }}</span>
          
          <select :value="trig.Condition" @change="e => updateListElement(idx, 'Condition', Number(e.target.value))" class="win-input type-select" style="margin-right: 5px;">
            <option v-for="opt in SelectOptions.BulletTriggerConditionList" :key="opt.id" :value="opt.id">When: {{ opt.name }}</option>
          </select>

          <select :value="trig.EffectType" @change="e => updateListElement(idx, 'EffectType', Number(e.target.value))" class="win-input type-select">
            <option v-for="opt in SelectOptions.BulletEffectTypeList" :key="opt.id" :value="opt.id">Do: {{ opt.name }}</option>
          </select>
          <button @click="removeListElement(idx)" class="btn-delete">×</button>
        </div>

        <div class="ve-grid">
          <div class="field-row"><label>Cooldown</label><input type="number" :value="trig.Cooldown" @input="e => updateListElement(idx, 'Cooldown', parseFloat(e.target.value))" class="win-input" step="0.1"></div>

          <template v-if="isTrigSfx(trig.EffectType)">
            <div class="field-row full-row">
              <label>Vis.Effect</label>
              <select :value="trig.VisualEffect" @change="e => updateListElement(idx, 'VisualEffect', Number(e.target.value))" class="win-input">
                <option :value="0">[NONE]</option>
                <option v-for="ve in getItemsByType(ItemType.VisualEffect)" :key="ve.id" :value="ve.id">[ID: {{ ve.id }}] {{ ve.name }}</option>
              </select>
            </div>
            <div class="field-row full-row"><label>AudioClip</label><input type="text" :value="trig.AudioClip" @input="e => updateListElement(idx, 'AudioClip', e.target.value)" class="win-input" placeholder="Audio path"></div>
            
            <div class="field-row"><label>Size</label><input type="number" :value="trig.Size" @input="e => updateListElement(idx, 'Size', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
            <div class="field-row"><label>Lifetime</label><input type="number" :value="trig.Lifetime" @input="e => updateListElement(idx, 'Lifetime', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
            
            <div class="field-row check-row"><label>OncePerColl</label><input type="checkbox" :checked="trig.OncePerCollision" @change="e => updateListElement(idx, 'OncePerCollision', e.target.checked)"></div>
            <template v-if="isTrigPlaySfx(trig.EffectType)">
              <div class="field-row check-row"><label>UseBulPos</label><input type="checkbox" :checked="trig.UseBulletPosition" @change="e => updateListElement(idx, 'UseBulletPosition', e.target.checked)"></div>
              <div class="field-row check-row"><label>SyncLife</label><input type="checkbox" :checked="trig.SyncLifetimeWithBullet" @change="e => updateListElement(idx, 'SyncLifetimeWithBullet', e.target.checked)"></div>
            </template>
          </template>

          <template v-else-if="isTrigBullet(trig.EffectType)">
            <div class="field-row full-row">
              <label>Ammunition</label>
              <select :value="trig.Ammunition" @change="e => updateListElement(idx, 'Ammunition', Number(e.target.value))" class="win-input">
                <option :value="0">[NONE]</option>
                <option v-for="am in getItemsByType(ItemType.Ammunition)" :key="am.id" :value="am.id">[ID: {{ am.id }}] {{ am.name }}</option>
              </select>
            </div>
            <div class="field-row full-row"><label>AudioClip</label><input type="text" :value="trig.AudioClip" @input="e => updateListElement(idx, 'AudioClip', e.target.value)" class="win-input"></div>
            
            <div class="field-row"><label>Quantity</label><input type="number" :value="trig.Quantity" @input="e => updateListElement(idx, 'Quantity', parseInt(e.target.value))" class="win-input"></div>
            <div class="field-row"><label>Size</label><input type="number" :value="trig.Size" @input="e => updateListElement(idx, 'Size', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
            <div class="field-row"><label>RndFactor</label><input type="number" :value="trig.RandomFactor" @input="e => updateListElement(idx, 'RandomFactor', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
            <div class="field-row"><label>PowerMult</label><input type="number" :value="trig.PowerMultiplier" @input="e => updateListElement(idx, 'PowerMultiplier', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
            <div class="field-row"><label>MaxNestLvl</label><input type="number" :value="trig.MaxNestingLevel" @input="e => updateListElement(idx, 'MaxNestingLevel', parseInt(e.target.value))" class="win-input"></div>
            
            <div class="field-row full-row"><label>Expr Rot</label><input type="text" :value="trig.Rotation" @input="e => updateListElement(idx, 'Rotation', e.target.value)" class="win-input"></div>
            <div class="field-row full-row"><label>Expr OffX</label><input type="text" :value="trig.OffsetX" @input="e => updateListElement(idx, 'OffsetX', e.target.value)" class="win-input"></div>
            <div class="field-row full-row"><label>Expr OffY</label><input type="text" :value="trig.OffsetY" @input="e => updateListElement(idx, 'OffsetY', e.target.value)" class="win-input"></div>
          </template>

          <template v-else-if="isTrigGravity(trig.EffectType)">
            <div class="field-row"><label>Size</label><input type="number" :value="trig.Size" @input="e => updateListElement(idx, 'Size', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
            <div class="field-row"><label>PowerMult</label><input type="number" :value="trig.PowerMultiplier" @input="e => updateListElement(idx, 'PowerMultiplier', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
          </template>

          <template v-if="isTrigSfx(trig.EffectType) || isTrigBullet(trig.EffectType)">
            <div class="field-row">
              <label>Mode</label>
              <select :value="trig.ColorMode" @change="e => updateListElement(idx, 'ColorMode', Number(e.target.value))" class="win-input">
                <option v-for="opt in SelectOptions.ColorModeList" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <label>Color</label>
              <div class="color-wrap">
                <input type="color" :value="toPickerColor(trig.Color)" @input="e => updateListElement(idx, 'Color', e.target.value)" class="color-picker">
                <input type="text" :value="trig.Color" @input="e => updateListElement(idx, 'Color', e.target.value)" class="win-input small-text">
              </div>
            </div>
          </template>

        </div>
      </div>
      <button @click="addTrigger" class="btn-add" style="color: #FFAA00; border-color: #FFAA00;">+ Add Trigger</button>
    </div>

    <div v-else-if="mode === 'effects'">
      <div v-for="(eff, idx) in modelValue" :key="idx" class="ve-item" style="border-left-color: #FF5555;">
        <div class="ve-header">
          <span class="ve-index">Eff #{{ idx + 1 }}</span>
          <select :value="eff.Type" @change="e => updateListElement(idx, 'Type', Number(e.target.value))" class="win-input type-select">
            <option v-for="opt in SelectOptions.ImpactEffectTypeList" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
          <button @click="removeListElement(idx)" class="btn-delete">×</button>
        </div>
        
        <div class="ve-grid">
          <div class="field-row full-row">
            <label>Dmg Type</label>
            <select :value="eff.DamageType" @change="e => updateListElement(idx, 'DamageType', isNaN(e.target.value) ? e.target.value : Number(e.target.value))" class="win-input">
              <option v-for="(dmg, dIdx) in SelectOptions.DamageType" :key="dIdx" :value="dIdx">{{ dmg }}</option>
            </select>
          </div>
          <div class="field-row"><label>Power</label><input type="number" :value="eff.Power" @input="e => updateListElement(idx, 'Power', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
          <div class="field-row"><label>Factor</label><input type="number" :value="eff.Factor" @input="e => updateListElement(idx, 'Factor', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        </div>
      </div>
      <button @click="addEffect" class="btn-add" style="color: #FF5555; border-color: #FF5555;">+ Add Effect</button>
    </div>

  </div>
</template>

<style scoped>
.ammo-container { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.ve-item { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-light); border-left-width: 4px; padding: 10px; border-radius: 4px; }
.single-block { background: rgba(255, 255, 255, 0.02); }

.ve-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px; }
.ve-index { font-weight: bold; color: var(--text-secondary); min-width: 25px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
.type-select { flex: 1; font-weight: bold; color: var(--accent-color); }

.btn-delete { background: rgba(255,50,50,0.1); color: #ff5555; border: 1px solid #ff5555; border-radius: 4px; cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 1; }
.btn-delete:hover { background: #ff5555; color: white; }

.ve-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center; }
.field-row { display: flex; align-items: center; gap: 8px; }
.full-row { grid-column: span 2; }
.field-row label { width: 65px; font-size: 10px; opacity: 0.7; overflow: hidden; white-space: nowrap; }

.win-input { flex: 1; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: white; border-radius: 3px; font-size: 11px; min-width: 0; }
.win-input:focus { border-color: var(--accent-color); outline: none; }

.color-wrap { flex: 1; display: flex; gap: 4px; align-items: center; }
.color-picker { width: 20px; height: 20px; border: none; padding: 0; background: none; cursor: pointer; }
.small-text { font-family: monospace; letter-spacing: -0.5px; }

.check-row { justify-content: flex-start; cursor: pointer; margin-top: 4px; }
.check-row label { cursor: pointer; width: auto; margin-right: 5px; }
.check-row input { cursor: pointer; }

.btn-add { padding: 10px; background: rgba(0,0,0,0.2); border: 1px dashed; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-weight: bold; }
.btn-add:hover { background: rgba(255,255,255,0.05); }
</style>
<script setup>
import {ref} from 'vue'
import LovePreview from './LovePreview.vue'
import CouplePreview from './CouplePreview.vue'
defineProps({chart:Object,assessment:Object,input:Object,relationshipStatus:String,remoteReader:Function,savedReader:Function,storageKey:String})
const emit=defineEmits(['profile'])
const tab=ref('love')
</script>
<template><section class="love-hub"><div class="love-hub-tabs" role="tablist" aria-label="ดวงความรักและดวงคู่"><button role="tab" :aria-selected="tab==='love'" @click="tab='love'">ความรัก</button><button role="tab" :aria-selected="tab==='couple'" @click="tab='couple'">ดวงคู่</button></div><KeepAlive><LovePreview v-if="tab==='love'" :chart="chart" :assessment="assessment" :input="input" :relationship-status="relationshipStatus" @profile="emit('profile')"/><CouplePreview v-else :input="input" :remote-reader="remoteReader" :saved-reader="savedReader" :storage-key="storageKey" @profile="emit('profile')"/></KeepAlive></section></template>
<style scoped>.love-hub{max-width:860px;margin:auto;min-width:0}.love-hub-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 18px;background:#7a293d}.love-hub-tabs button{padding:11px;border:1px solid #fff3;border-radius:12px;background:transparent;color:#f4dce1;font:inherit;cursor:pointer}.love-hub-tabs button[aria-selected=true]{background:#fff8f1;color:#78283e}.love-hub-tabs button:focus-visible{outline:3px solid #d7b775}</style>

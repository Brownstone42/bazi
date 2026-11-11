<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ pictureUrl: { type: String, default: '' }, name: { type: String, default: '' }, plan: { type: String, default: 'Free' } })
defineEmits(['profile'])
const imageFailed = ref(false)
watch(() => props.pictureUrl, () => { imageFailed.value = false })
</script>

<template>
  <header class="preview-header">
    <h1 style="color: #fff">สถิติ ดิถี</h1>
    <div class="preview-header-user">
      <span class="preview-plan" :aria-label="`แพ็กเกจ ${plan}`"><i class="pi pi-crown" aria-hidden="true" /> {{ plan }}</span>
      <button type="button" class="preview-avatar" :aria-label="name ? `โปรไฟล์ ${name}` : 'โปรไฟล์ผู้ใช้'" @click="$emit('profile')">
        <img v-if="pictureUrl && !imageFailed" :src="pictureUrl" alt="รูปโปรไฟล์ LINE" referrerpolicy="no-referrer" @error="imageFailed = true" />
        <svg v-else viewBox="0 0 48 48" role="img" aria-label="รูปผู้ใช้จำลอง"><rect width="48" height="48" rx="24" fill="#eadbc4" /><path d="M8 48v-8c0-9 7-14 16-14s16 5 16 14v8" fill="#647b6a" /><ellipse cx="24" cy="19" rx="10" ry="12" fill="#c58d70" /><path d="M14 20c-4-11 4-17 11-16 9 0 12 9 9 16-2-2-3-6-4-9-4 5-10 6-16 5z" fill="#493a35" /></svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.preview-header{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#711d2b;color:#fffaf3;border-radius:22px;padding:18px 22px;margin-bottom:16px}.preview-header h1{font-size:1.25rem;margin:0;font-weight:700;white-space:nowrap}.preview-header-user{display:flex;align-items:center;gap:12px}.preview-plan{display:flex;align-items:center;gap:7px;border:1px solid #ffffff30;background:#ffffff18;border-radius:30px;padding:7px 13px;font-size:.85rem}.preview-avatar{display:block;flex-shrink:0;width:42px;height:42px;padding:0;border:2px solid #ffffff70;border-radius:50%;background:#eadbc4;overflow:hidden;cursor:pointer}.preview-avatar img,.preview-avatar svg{display:block;width:100%;height:100%;object-fit:cover}.preview-avatar:focus-visible{outline:3px solid #d6b575;outline-offset:3px}@media(max-width:420px){.preview-header{padding:14px 16px}.preview-header-user{gap:8px}.preview-plan{padding:6px 10px}}
</style>

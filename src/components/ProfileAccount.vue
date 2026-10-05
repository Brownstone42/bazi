<script setup>
defineProps({ session: { type: Object, required: true }, subtitle: { type: String, default: '' } })
</script>

<template>
  <section class="profile-account" aria-labelledby="profile-account-title">
    <h3 id="profile-account-title">บัญชี</h3>
    <div class="profile-account-card">
      <div><span>เข้าสู่ระบบด้วย</span><strong>{{ session.status === 'local' ? 'บัญชีจำลอง' : 'LINE' }}</strong></div>
      <div class="profile-account-identity"><span>บัญชีที่ใช้งาน</span><span><img v-if="session.profile?.pictureUrl" :src="session.profile.pictureUrl" alt="" /><strong>{{ session.profile?.displayName || 'ผู้ใช้ LINE' }}</strong></span></div>
      <div><span>{{ session.status === 'local' ? 'บันทึกในเบราว์เซอร์นี้' : subtitle }}</span></div>
    </div>
  </section>
</template>

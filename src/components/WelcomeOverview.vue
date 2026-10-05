<script setup>
defineEmits(['start'])

const features = [
  { icon: 'pi-user', title: 'พื้นดวงของคุณ', detail: 'รู้จักบุคลิก จุดเด่น และความถนัดจากวันเวลาเกิด', access: 'อ่านฟรี' },
  { icon: 'pi-chart-line', title: 'ถนนชีวิต 10 ปี', detail: 'สำรวจแนวโน้มชีวิตและสิ่งที่น่าใส่ใจในแต่ละช่วงวัย', access: 'ฟรีทุกช่วง' },
  { icon: 'pi-calendar', title: 'ปฏิทินของฉัน', detail: 'ดูคะแนนรายด้านและดาวที่สัมพันธ์กับดวงคุณ เพื่อช่วยวางแผนวันสำคัญ', access: 'ดูวันนี้ฟรี' },
  { icon: 'pi-users', title: 'เปรียบเทียบบุคคล', detail: 'เข้าใจจุดที่ส่งเสริมกันและสิ่งที่ต้องปรับในความสัมพันธ์', access: 'ฟรีคนแรก' },
]
</script>

<template>
  <section class="welcome-overview" aria-labelledby="welcome-title">
    <div class="welcome-intro">
      <span class="welcome-kicker">เริ่มรู้จักตัวเอง</span>
      <h2 id="welcome-title">เข้าใจตัวเอง<br />แล้วเลือกจังหวะที่เหมาะกับคุณ</h2>
      <p>ที่นี่เราสรุปให้เป็นภาษาที่อ่านง่าย ตั้งแต่ตัวตน ความสัมพันธ์ ไปจนถึงจังหวะของแต่ละวัน</p>
      <button class="welcome-start" type="button" @click="$emit('start')">เริ่มดูพื้นดวงฟรี <i class="pi pi-arrow-down" aria-hidden="true" /></button>
      <small class="welcome-free-note">เริ่มได้โดยไม่ต้องซื้อแพ็กเกจหรือกรอกข้อมูลบัตร</small>
    </div>
    <div class="welcome-features">
      <article v-for="feature in features" :key="feature.title" class="welcome-feature">
        <i class="pi" :class="feature.icon" aria-hidden="true" />
        <div><h3>{{ feature.title }}</h3><p>{{ feature.detail }}</p><span>{{ feature.access }}</span></div>
      </article>
    </div>
  </section>
</template>

# BaZi LIFF Prototype

ต้นแบบ localhost สำหรับคำนวณสี่เสา/แปดอักษรด้วย `@openfate/bazi-engine` โดยใช้ Vue 3, Vite, PrimeVue, Tailwind และ pnpm เช่นเดียวกับ `mini-erp/web-app`

```bash
pnpm install
pnpm dev
```

เปิด `http://127.0.0.1:5173`

## เผยแพร่ผ่าน GitHub และ Netlify

โปรเจกต์นี้เป็นเว็บ Vite แบบ static ใช้ Node.js 22 และ pnpm ตาม `packageManager` ใน `package.json` โดยตั้งค่า Netlify ใน `netlify.toml` ให้รัน `pnpm build` แล้วเผยแพร่โฟลเดอร์ `dist`

หลังนำโค้ดขึ้น GitHub ให้สร้างโปรเจกต์ใหม่ใน Netlify ด้วย **Import from Git** แล้วเลือก repository นี้ การ push ครั้งถัดไปจะเริ่ม deploy อัตโนมัติ

ก่อนเผยแพร่ ตรวจสอบด้วย `pnpm test`, `pnpm lint` และ `pnpm build` ส่วนข้อมูลใน `.env*`, `node_modules`, `dist` และ `.netlify` จะไม่ถูกส่งขึ้น GitHub

> หน้าเปรียบเทียบบุคคลยังไม่มีระบบชำระเงินหรือสิทธิ์การเข้าถึง แม้จะแสดงว่าเป็นฟีเจอร์พิเศษ ผู้เข้าชมเว็บที่เผยแพร่จะสามารถใช้งานได้ในระยะทดสอบ

เปิดโหมดทดสอบคำอ่านแบบปิดข้อมูลสำหรับใช้ภายในที่
`http://127.0.0.1:5173/?mode=blind-test`

โหมดนี้จะแสดงคำอ่านไม่ระบุดิถี 3 ชุด ให้ผู้ทดสอบเลือกชุดที่ตรงที่สุดก่อนดูเฉลย
ผลทดสอบถูกเก็บในเบราว์เซอร์ของเครื่องนั้น โดยไม่บันทึกวันเกิด เวลาเกิด หรือเขตเวลา

## LINE LIFF

กำหนด LIFF ID สำหรับการพัฒนาในไฟล์ `.env.local` โดยอ้างอิงรูปแบบจาก `.env.example`

```env
VITE_LIFF_ID=1234567890-AbCdEfgh
```

บน localhost ระบบจะข้าม LINE Login เพื่อให้พัฒนาได้ตามปกติ ส่วน production จะเริ่ม LINE Login อัตโนมัติและแสดงชื่อกับรูปโปรไฟล์ของผู้ใช้ เมื่อเปิดผ่านแอป LINE ระบบจะใช้ session ของ LINE ที่มีอยู่แล้ว

LIFF ID เป็นข้อมูลฝั่งหน้าเว็บและไม่ใช่ Channel Secret ห้ามนำ Channel Secret มาใส่ในตัวแปร `VITE_` หรือ commit ลง repository

> ระบบใช้เวลาท้องถิ่นตาม timezone ที่ผู้ใช้เลือก โดยล็อกกฎเปลี่ยนวันไว้ที่ 23:00

## Interpretation specifications

- [ความแข็ง–อ่อนของดิถีและธาตุให้คุณ](docs/interpretation/day-master-strength-spec.md)
- [Reference cases สำหรับ Strength Rule Engine](docs/interpretation/reference-cases.md)

## Interpretation engine

- `src/services/strength-engine.js` ประเมินกำลังดิถี โครงสร้าง 用神 และ喜神 พร้อม evidence และ rule version
- `src/services/day-master-strength-matrix.js` มีคำอ่านเฉพาะ 10 ดิถี × 5 ระดับกำลัง รวม 50 รูปแบบ พร้อม content version

> คำอ่าน Matrix รุ่น `day-master-matrix/0.3.0` เป็น baseline สำหรับพัฒนาผลิตภัณฑ์ ควรให้ผู้เชี่ยวชาญศาสตร์จื่อผิงทบทวนก่อนใช้เชิงพาณิชย์

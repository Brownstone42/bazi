import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const page = name => new JSDOM(readFileSync(`public/${name}`, 'utf8')).window.document

describe('published policy pages', () => {
  it('provides accessible help with correct package limits, troubleshooting and working anchors', () => {
    const document = page('help.html')
    expect(document.documentElement.lang).toBe('th')
    expect(document.querySelector('meta[name="viewport"]')).not.toBeNull()
    expect(document.querySelectorAll('details').length).toBeGreaterThan(10)
    for (const detail of document.querySelectorAll('details')) expect(detail.firstElementChild.tagName).toBe('SUMMARY')
    for (const link of document.querySelectorAll('a[href^="#"]')) expect(document.getElementById(link.getAttribute('href').slice(1))).not.toBeNull()
    for (const text of ['149 บาท', '999 บาท', '59 บาท', '30 วัน', '90 วัน', '5 คน', '10 คน', 'ไม่ทบ', 'ตรวจสอบการชำระและสิทธิ์อีกครั้ง', 'อย่าเพิ่งซื้อซ้ำ', '1 ครั้งต่อ 30 วัน', 'ไม่หักสิทธิ์เพิ่ม']) expect(document.body.textContent).toContain(text)
    expect(page('service.html').querySelector('a[href="/help.html"]')).not.toBeNull()
  })
  it.each(['terms.html', 'privacy.html'])('%s contains public text, contact and valid local anchors', name => {
    const document = page(name)
    expect(document.documentElement.lang).toBe('th')
    expect(document.querySelector('meta[name="viewport"]')).not.toBeNull()
    expect(document.title).not.toContain('ร่าง')
    expect(document.querySelector('.draft')).toBeNull()
    expect(document.body.textContent).not.toContain('ยังไม่เผยแพร่')
    expect(document.body.textContent).toContain('2 ตุลาคม 2569')
    expect(document.body.textContent).toContain('กรุงเทพมหานคร 10140')
    expect(document.querySelector('a[href="mailto:support.geniuspicture@gmail.com"]')).not.toBeNull()
    for (const link of document.querySelectorAll('a[href^="#"]')) {
      expect(document.getElementById(link.getAttribute('href').slice(1))).not.toBeNull()
    }
    for (const link of document.querySelectorAll('a[href$=".html"]')) {
      expect(() => page(link.getAttribute('href'))).not.toThrow()
    }
    expect(document.querySelector('link[rel="stylesheet"]').getAttribute('href')).toBe('legal.css')
  })
  it('links both policies from the service page and does not promise automatic erasure', () => {
    const service = page('service.html')
    expect(service.querySelector('a[href="/terms.html"]')).not.toBeNull()
    expect(service.querySelector('a[href="/privacy.html"]')).not.toBeNull()
    const text = page('privacy.html').body.textContent
    expect(text).toContain('การส่งอีเมลไม่ได้ทำให้ข้อมูลถูกลบอัตโนมัติ')
    expect(text).toContain('ไม่ตัดสิทธิ์ขอแก้ข้อมูลส่วนบุคคล')
    expect(text).toContain('ไม่ใช่ความยินยอมของบุคคลอื่น')
  })
})

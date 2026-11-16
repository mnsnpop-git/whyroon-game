# Prompt สำหรับสร้างรูปไพ่ (เกม Doraemon)

ไพ่จะโหลดรูปจาก `public/cards/<หมายเลข>.png` อัตโนมัติ ถ้ายังไม่มีไฟล์จะแสดงแบบตัวเลขเดิม

| หมายเลข | ชื่อไฟล์ |
| --- | --- |
| A, 2–10, J, Q, K | `A.png`, `2.png`, … `10.png`, `J.png`, `Q.png`, `K.png` |

## มาสคอต "น้องร่าเริง"

ทุกใบใช้ตัวละครเดียวกัน ทำท่าตามกติกาของใบนั้น — เป็นตัวละครออริจินัลของเกมนี้เอง
(ไม่ใช้ตัวการ์ตูนที่มีลิขสิทธิ์ เพราะเอามาใช้ในเกมไม่ได้ และเครื่องมือ AI ส่วนใหญ่ก็ไม่ยอมสร้างให้)

> หน้าตา: แพนด้าตัวกลมป้อม ใส่ฮู้ดดี้สีเหลืองลายดาวชมพู ตาโตเป็นประกาย แก้มแดง ตัวสูงราว 2 หัว

## วิธีใช้

1. **สร้างใบ A ก่อน** ด้วย Style + prompt ของ A — เลือกรูปที่ชอบที่สุดไว้เป็นต้นแบบ
2. ใบต่อ ๆ ไป แนบรูป A เป็น reference แล้วสั่ง *"use the same character as the reference image"* ต่อหน้า prompt
   (ChatGPT / Gemini แนบรูปได้เลย, Midjourney ใช้ `--cref <ลิงก์รูป>`) ตัวละครจะได้หน้าตาเหมือนกันทุกใบ
3. สร้างภาพแนวตั้ง อัตราส่วน **5:7** (หรือ 2:3) เช่น 1000×1400 px
4. ตั้งชื่อไฟล์ตามตาราง วางใน `public/cards/` แล้วรีเฟรชหน้าเว็บ

> ไม่ต้องลดขนาดไฟล์ — `next/image` ย่อและแปลงเป็น WebP ให้เอง
> มุมซ้ายบนและขวาล่างจะมีป้ายเลขไพ่ทับอยู่ ภาพจึงควรเว้นมุมไว้ (prompt ใส่ไว้ให้แล้ว)

## Style (ใช้ร่วมกันทุกใบ)

```
Playing card illustration, vertical 5:7 portrait, cute chibi cartoon style,
bold clean outlines, flat vibrant colors with soft shading, festive party mood.
Main character (same in every card): "Rara", a chubby round baby panda mascot,
2 heads tall, big sparkly eyes, rosy cheeks, wearing a bright yellow hoodie
with small pink stars. Background friends are simple round animal mascots
(bunny, frog, duck) in pastel colors.
Main subject centered, keep top-left and bottom-right corners empty,
no text, no letters, no numbers, no logos, no existing cartoon characters.
```

## Prompt ของแต่ละใบ

| ใบ | กติกา | Prompt |
| --- | --- | --- |
| **A** | คนจั่วดื่มเอง 1 แก้ว | `Rara standing proudly in a spotlight, chugging one big frothy mug alone, eyes closed, happy blush.` |
| **2** | หาเพื่อนดื่ม 1 คน | `Rara pulling one bunny friend by the hand, both clinking glasses together and laughing.` |
| **3** | หาเพื่อนดื่ม 2 คน | `Rara hugging a bunny and a frog friend, the three of them clinking glasses in the middle.` |
| **4** | คนซ้ายมือดื่ม | `Rara pointing dramatically to the LEFT with a big arrow, a surprised duck friend on the left holding a glass.` |
| **5** | ดื่มรอบวง | `Rara and friends sitting in a circle seen from above, everyone raising glasses at the same time, confetti.` |
| **6** | คนขวามือดื่ม | `Rara pointing dramatically to the RIGHT with a big arrow, a surprised frog friend on the right holding a glass.` |
| **7** | บัดดี้ | `Rara and a bunny friend tied together by a glowing pink heart rope, matching poses, both holding drinks.` |
| **8** | พักผ่อน 2 นาที | `Rara lying in a hammock with eyes closed and a sleep bubble, a big stopwatch floating beside, calm chill vibe.` |
| **9** | มินิเกม | `Rara playing rock-paper-scissors against a frog friend, dice and game controller flying around, excited faces.` |
| **10** | ตั้งกฎในเกม | `Rara wearing a tiny judge wig, holding an unrolled scroll and banging a gavel, friends watching nervously.` |
| **J** | แจ็คจับหน้า | `Rara making a funny face while touching their nose and pulling one ear, friends behind rushing to copy the same pose.` |
| **Q** | แหม่มไม่มีเพื่อนคบ | `Rara wearing a small queen tiara, sitting alone on a throne pouting, friends turned away with fingers on lips (shh).` |
| **K** | กติกาพิเศษ K | `Rara wearing a big golden king crown and red cape, raising a royal goblet, sparkles and a glowing mysterious envelope.` |

> **K** มีกติกาที่หัวหน้าห้องตั้งเองได้ในแต่ละเกม จึงใช้ภาพกลาง ๆ ที่ไม่ผูกกับกติกาใดกติกาหนึ่ง

# Experimental daily guide (localhost identity60)

This is a separate symbolic direction layer, not a change to natal Bazi or daily scores.

## Calendar and chart convention

- lunar-javascript 1.7.7 supplies pillars and astronomical solar terms.
- Bangkok civil time (UTC+7), no true-solar correction. Qimen day changes at 23:00.
- Terms are evaluated at the instant, converting Bangkok to the library's UTC+8 term clock. No whole-day term approximation.
- Hourly Chaibu rotating plate: term selects yin/yang and three ju numbers; preceding Jia/Ji day selects yuan.
- Earth plate runs Wu/Ji/Geng/Xin/Ren/Gui/Ding/Bing/Yi through numerical palaces, forward in yang, backward in yin.
- Chief deity follows the hour stem (Jia hidden under its xun stem). Central placement lodges in Kun 2.
- Chief door advances from the **raw** xun-head palace through nine palaces by elapsed hours in the xun; then central landing lodges in Kun 2. Other doors rotate with it on the eight-palace ring.
- Deities rotate clockwise in yang and anticlockwise in yin. No ninth direction is shown.

Algorithm reference: [Jy447/qimen](https://github.com/Jy447/qimen), MIT; license retained in qimen-reference-LICENSE.txt. Our raw-central-palace counting, 23:00 rollover and instant-based Bangkok term handling are explicit choices, differing from parts of that implementation. Tests include hand-worked xun-head charts and boundary checks; no claim of independent expert certification.

## UI interpretation

Authority = Chief; intention/prayer = Nine Heaven; wealth = Nine Earth. This app selects these symbolic associations; they are not an assertion of the reference website's methodology. Open/Rest/Death doors are displayed for starting work/rest/avoidance. These are positions, **not full palace auspiciousness judgments**: stars, stem formations, void, tomb and door-palace constraints are not yet scored. Do not label this a complete Qimen reading.

Daily wealth direction uses the civil day's Cai Shen from [lunar-javascript](https://6tail.cn/calendar/lunar.html), independent of Qimen.

Colors retain the existing daily-balance options; when absent use only a resolved primary natal useful element for regular charts. Caution colors come from natal caution elements. HeTu numbers map water 1/6, wood 3/8, fire 2/7, metal 4/9, earth 5/10; display separately, not as a lottery number. Sources for symbolic associations: [Joey Yap](https://www.joeyyap.com/awakening/dl/SpiritualAwakeningBlueprint.pdf), [HeTu discussion](https://www.laurentlanglais.com/feng-shui/5-elements-numerology-tcm). Colors/numbers need not change daily.

Hour selection uses the same selected segment as the colored arc. Automatic selection uses the actual current Bangkok minute; manually selected segments use start + 30 minutes, explicitly visible in calculation details. A solar term can change within a segment.

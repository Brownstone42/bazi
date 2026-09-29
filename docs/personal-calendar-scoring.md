# Personal daily calendar prototype

The UI uses the existing personalized daily model, not a universal Tong Shu score. Display score = round(50 + 10 * clamp(raw, -5, 5)), hence 0–100, not a success probability. Underlying day rankings and topic rules are unchanged. All-topics is the mean of the five topic raw scores; per-topic status can differ from the overall status. Changing the monthly focus changes the displayed scope; clicking daily topic cards only changes advice.

Six display groups (seven underlying stars) are checked against the selected day's branch:

- Nobleman, Intelligence, and Lu Shen use the natal day stem.
- Peach Blossom and Sky Horse use the natal YEAR branch's three-harmony group. Other schools may also use the day branch; this version does not mix conventions or count both twice.
- Personal Space combines Solitary and Loneliness into one display group, preserving the detected source star in metadata. Both use the natal YEAR branch's seasonal group, not the three-harmony groups.

Sources: Joey Yap, *Hack Your Destiny With BaZi*, pp.15–16, https://www.joeyyap.com/notes/hydb/Hack_Your_Destiny_With_BaZi.pdf ; Lu Shen (祿神, not 福星) table and transit usage: https://www.chinesebazi.com/Home/Symbolic-Stars-Bazi/?id=3&str=Prosperity+star . Interpretations are original Thai editorial copy, not literal classical translations. This is a limited daily-transit overlay, not a complete set of Shen Sha or a reconstruction of Sesheta's formula. Stars contribute **zero** to numeric scoring. More icons do not mean a better day; no icons do not mean a bad day. Do not infer guaranteed money, romance, travel safety, isolation, or breakup from a single star.

The daily chart is sampled at noon using the user's configured timezone, as in the existing engine. It is not an hourly election or an exact intraday solar-term-boundary reading. No medical, investment or event-success guarantee should be inferred from the score. Validate weighting before presenting it as a mature paid scoring model.

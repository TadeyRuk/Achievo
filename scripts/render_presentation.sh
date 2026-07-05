#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="${TMPDIR:-/tmp}/achievo-presentation"
OUT="${ROOT_DIR}/achievo-app-presentation-v2.mp4"
AUDIO="${ROOT_DIR}/achievo-demo-voiceover-v2.mp3"
FONT_REG="/usr/share/fonts/google-noto/NotoSans-Regular.ttf"
FONT_BOLD="/usr/share/fonts/google-noto/NotoSans-Bold.ttf"

if [[ ! -f "${AUDIO}" ]]; then
  echo "Missing audio file: ${AUDIO}" >&2
  exit 1
fi

rm -rf "${WORK_DIR}"
mkdir -p "${WORK_DIR}/slides"

make_mockup() {
  local src="$1"
  local dst="$2"
  local max_w="$3"
  local max_h="$4"

  convert "${src}" \
    -auto-orient \
    -resize "${max_w}x${max_h}>" \
    -bordercolor white -border 14 \
    \( +clone -background '#122034' -shadow 32x18+0+18 \) +swap \
    -background none -layers merge +repage \
    "${dst}"
}

make_slide() {
  local index="$1"
  local title="$2"
  local subtitle="$3"
  local image="$4"
  local accent="$5"
  local mockup="${WORK_DIR}/mockup-${index}.png"
  local title_layer="${WORK_DIR}/title-${index}.png"
  local subtitle_layer="${WORK_DIR}/subtitle-${index}.png"
  local slide="${WORK_DIR}/slides/slide-${index}.png"

  make_mockup "${image}" "${mockup}" 900 780

  convert -background none -fill '#0f2138' -font "${FONT_BOLD}" -pointsize 70 \
    -size 820x185 caption:"${title}" "${title_layer}"
  convert -background none -fill '#40556f' -font "${FONT_REG}" -pointsize 35 \
    -size 690x210 caption:"${subtitle}" "${subtitle_layer}"

  convert -size 1920x1080 xc:'#f7f9fc' \
    -fill '#0b1728' -draw 'rectangle 0,0 1920,1080' \
    -fill '#f6f8fb' -draw 'rectangle 76,76 1844,1004' \
    -fill "${accent}" -draw 'rectangle 76,76 1844,96' \
    -fill "${accent}" -draw 'roundrectangle 122,890 418,946 18,18' \
    -fill '#ffffff' -font "${FONT_BOLD}" -pointsize 25 -gravity NorthWest \
      -annotate +154+906 'ACHIEVO DEMO' \
    "${slide}"

  composite -gravity NorthWest -geometry +118+145 "${title_layer}" "${slide}" "${slide}"
  composite -gravity NorthWest -geometry +122+290 "${subtitle_layer}" "${slide}" "${slide}"
  composite -gravity East -geometry +132+0 "${mockup}" "${slide}" "${slide}"
}

make_split_slide() {
  local index="$1"
  local title="$2"
  local subtitle="$3"
  local left_img="$4"
  local right_img="$5"
  local accent="$6"
  local left="${WORK_DIR}/mockup-${index}-left.png"
  local right="${WORK_DIR}/mockup-${index}-right.png"
  local title_layer="${WORK_DIR}/title-${index}.png"
  local subtitle_layer="${WORK_DIR}/subtitle-${index}.png"
  local slide="${WORK_DIR}/slides/slide-${index}.png"

  make_mockup "${left_img}" "${left}" 520 760
  make_mockup "${right_img}" "${right}" 880 640

  convert -background none -fill '#0f2138' -font "${FONT_BOLD}" -pointsize 74 \
    -size 760x170 caption:"${title}" "${title_layer}"
  convert -background none -fill '#40556f' -font "${FONT_REG}" -pointsize 34 \
    -size 720x205 caption:"${subtitle}" "${subtitle_layer}"

  convert -size 1920x1080 xc:'#f7f9fc' \
    -fill '#0b1728' -draw 'rectangle 0,0 1920,1080' \
    -fill '#f6f8fb' -draw 'rectangle 76,76 1844,1004' \
    -fill "${accent}" -draw 'rectangle 76,76 1844,96' \
    -fill "${accent}" -draw 'roundrectangle 122,890 418,946 18,18' \
    -fill '#ffffff' -font "${FONT_BOLD}" -pointsize 25 -gravity NorthWest \
      -annotate +154+906 'ACHIEVO DEMO' \
    "${slide}"

  composite -gravity NorthWest -geometry +118+140 "${title_layer}" "${slide}" "${slide}"
  composite -gravity NorthWest -geometry +122+282 "${subtitle_layer}" "${slide}" "${slide}"
  composite -gravity SouthWest -geometry +210+104 "${left}" "${slide}" "${slide}"
  composite -gravity East -geometry +118+0 "${right}" "${slide}" "${slide}"
}

make_slide 01 \
  "Achievo" \
  "AI student rewards, paid on Stellar." \
  "${ROOT_DIR}/mobile-splash.png" \
  '#f4b63f'

make_slide 02 \
  "Home Dashboard" \
  "Students see streaks, community pulse, and a clear submit action." \
  "${ROOT_DIR}/docs/screenshots/7a7c6956-f839-4354-ad44-1de7243da92a.jpeg" \
  '#1f9f8b'

make_slide 03 \
  "Academic Activity" \
  "A student describes tutoring, workshops, volunteering, events, or participation." \
  "${ROOT_DIR}/desktop-phone-frame.png" \
  '#315bff'

make_slide 04 \
  "Five-Agent Pipeline" \
  "Activity, verification, reward, Stellar, and feedback agents coordinate the payout." \
  "${ROOT_DIR}/docs/screenshots/c01b6332-92b9-4e87-a425-309bddc3017f.jpeg" \
  '#f4b63f'

make_slide 05 \
  "Wallet Proof" \
  "The student signs ownership before any reward transaction is sent." \
  "${ROOT_DIR}/desktop-wallet-tab.png" \
  '#1f9f8b'

make_slide 06 \
  "On-Chain Reward" \
  "Valid work earns XLM directly through the Soroban treasury contract." \
  "${ROOT_DIR}/docs/screenshots/593164cc-1ced-4da1-b54e-9e868dd12a8e.jpeg" \
  '#315bff'

make_slide 07 \
  "Student Profile" \
  "XP, earnings, streaks, and rank progress stay visible after every payout." \
  "${ROOT_DIR}/docs/screenshots/bf381d31-294b-42f6-96f0-6a00aa35031b.jpeg" \
  '#f4b63f'

make_slide 08 \
  "Scholar Ranks" \
  "Badge milestones turn repeated academic contribution into visible progress." \
  "${ROOT_DIR}/docs/screenshots/bd77e0f7-3a15-4e2d-a8d2-45e3d079a76c.jpeg" \
  '#1f9f8b'

make_slide 09 \
  "Quality Gate" \
  "Frontend and contract checks are green before demo submission." \
  "${ROOT_DIR}/ci-green.png" \
  '#315bff'

make_slide 10 \
  "Live Demo Ready" \
  "Mobile-ready PWA with AI scoring, wallet auth, and verifiable Stellar payouts." \
  "${ROOT_DIR}/desktop-phone-frame.png" \
  '#f4b63f'

duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${AUDIO}")"
slide_count="$(find "${WORK_DIR}/slides" -name 'slide-*.png' | wc -l)"
per_slide="$(awk -v total="${duration}" -v count="${slide_count}" 'BEGIN { printf "%.3f", total / count }')"
list="${WORK_DIR}/slides.txt"

: > "${list}"
for slide in "${WORK_DIR}"/slides/slide-*.png; do
  printf "file '%s'\n" "${slide}" >> "${list}"
  printf "duration %s\n" "${per_slide}" >> "${list}"
done
last_slide="$(find "${WORK_DIR}/slides" -name 'slide-*.png' | sort | tail -n 1)"
printf "file '%s'\n" "${last_slide}" >> "${list}"

ffmpeg -hide_banner -y \
  -f concat -safe 0 -i "${list}" \
  -i "${AUDIO}" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libopenh264 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k \
  -t "${duration}" -shortest -movflags +faststart \
  "${OUT}"

echo "${OUT}"

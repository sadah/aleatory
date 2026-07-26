import type { Work } from './types';

export const WORKS: Work[] = [
  {
    slug: 'lorenz-attractor',
    label: 'Study',
    date: '2026-07-23',
    animated: true,
    title: { en: 'Lorenz Attractor', ja: 'ローレンツ・アトラクター' },
    description: {
      en: 'A rotating 3D Lorenz strange attractor traced as a glowing ribbon, colored by instantaneous speed.',
      ja: '速度に応じて色づく発光リボンとして描いた、回転する3Dローレンツ・アトラクター。',
    },
    about: {
      en: [
        'The Lorenz system is three simple equations — a stripped-down model of convection in the atmosphere. Their solution never repeats and never settles, yet it never escapes this two-lobed shape. That bounded-but-unrepeating orbit is a strange attractor.',
        'The motion is fully deterministic: the same seed always traces the same path. But it is exquisitely sensitive — nudge the starting point and the trajectory soon diverges completely. Watching order produce something that looks alive and unpredictable is the whole point of the piece.',
        'The ribbon is coloured by speed: deep blue where the path crawls through the dense spirals, white-hot orange where it sweeps fast between the lobes. Light adds up where the trajectory overlaps itself. Drag to rotate; raise ρ to push the system further toward chaos. As a Study, it re-implements the system faithfully rather than reinterpreting it.',
      ],
      ja: [
        'ローレンツ方程式は、大気の対流を極限まで単純化した 3 本の式にすぎません。その解は決して繰り返さず静止もしませんが、この 2 つの翼のような形から外へ出ることもありません。この「有界なのに反復しない」軌道が strange attractor（ストレンジ・アトラクター）と呼ばれるものです。',
        '運動は完全に決定論的で、同じ seed は必ず同じ軌道を描きます。しかし初期値にきわめて敏感で、出発点をわずかにずらすだけで軌道はやがて全く別物になります。決定論から、生きているように予測不能に見えるものが立ち上がる——それを眺めることが、この作品の核心です。',
        'リボンは速度で色づけしてあります。密な渦をゆっくり這うところは深い青、翼の間を一気に駆けるところは白熱したオレンジ。軌道が自分自身と重なる場所ほど、光が加算されて明るくなります。ドラッグで回転し、ρ を上げると系はさらにカオス寄りになります。Study（習作）として、再解釈ではなく系そのものの忠実な再実装を目指しました。',
      ],
    },
    parameters: [
      {
        term: 'σ = 10, β = 8/3',
        desc: {
          en: 'The two constants held fixed (the Prandtl number and a geometric aspect ratio). They set the character of the system; only ρ is left adjustable.',
          ja: '固定してある 2 つの定数（プラントル数と幾何比）です。系の性格を決めます。可変にしてあるのは ρ だけです。',
        },
      },
      {
        term: 'ρ (rho)',
        desc: {
          en: 'The Rayleigh number — how hard the fluid is driven, and the main knob here. Below about 24.7 the motion decays to a fixed point; 28 is the classic chaotic value; higher reshapes the wings.',
          ja: 'レイリー数——流体をどれだけ強く駆動するか、この作品の主役つまみです。約 24.7 未満では軌道は 1 点に収束し、28 が古典的なカオス値です。上げるほど翼の形が変わります。',
        },
      },
      {
        term: 'Trail',
        desc: {
          en: 'How much of the recent path is kept and drawn — a longer trail thickens the ribbon into denser spirals.',
          ja: '直近の軌道をどれだけ保持して描くかを決めます。長いほどリボンが密な渦になります。',
        },
      },
      {
        term: 'Speed',
        desc: {
          en: 'Integration steps advanced per frame — how fast the bright head races along the curve.',
          ja: '1 フレームで進める積分ステップ数です。明るい先端がどれだけ速く曲線を進むかを決めます。',
        },
      },
      {
        term: 'Spin',
        desc: {
          en: 'Auto-rotation rate of the 3D view. Set it to zero and rotate by dragging instead.',
          ja: '3D ビューの自動回転の速さです。0 にすればドラッグで手動回転もできます。',
        },
      },
    ],
    tags: ['strange-attractor', 'chaos', 'rk4', 'glow'],
  },
  {
    slug: 'prime-spiral',
    label: 'Study',
    date: '2026-07-26',
    animated: true,
    title: { en: 'Prime Spiral Constellations', ja: '素数螺旋の星座' },
    description: {
      en: 'Every prime plotted in polar coordinates at radius p and angle p radians, revealed outward from the centre, linked to its nearest neighbours and coloured by the gap that precedes it.',
      ja: '半径 p・角度 p ラジアンの極座標にすべての素数を配置し、中心から外へ現れさせて近傍どうしを結び、直前の素数との間隔で色づけした星図。',
    },
    about: {
      en: [
        'Nothing here is drawn. Each prime number p is placed at radius p and angle p radians — one rule, applied to a list nobody chose. The bowed arcs simply connect each star to its nearest neighbours in the plane; they are a reading aid, not extra structure.',
        'The spokes are the surprise. Because 2π is very nearly 44/7, primes that share a remainder mod 44 land on almost the same ray, and the scattered dust snaps into 44 arms. Drift accumulates with radius, so further out the pattern reorganises around the next good approximation, 710/113. What breaks each arm into dashes and gaps is the irregularity of the primes themselves — the arms are where arithmetic is orderly, the gaps are where it is not.',
        'Colour makes that irregularity visible. Each star is tinted by the gap that precedes it, measured against the average spacing at its own scale, so the reading holds however far out you go. Tight pairs stay cool blue-white; a prime sitting unusually alone burns warm. Almost every star is cool — the handful of hot ones are the record gaps, and they are what keeps a field of pale dots from reading as texture.',
        'The seed does not touch the mathematics: the primes are exactly where they must be. It nudges the twist by less than one notch of the slider, sets the starting rotation, and assigns each star a scintillation phase — enough that every seed is a different sky, and any sky can be found again.',
      ],
      ja: [
        'ここには描いたものが一つもありません。素数 p を半径 p・角度 p ラジアンの位置に置く、それだけの規則を、誰も選んでいない数の列に当てはめています。弧は各星を平面上の近傍と結んだだけのもので、構造を足しているわけではありません。',
        '意外なのは光条です。2π は 44/7 にきわめて近いため、44 で割った余りが等しい素数はほぼ同じ光線上に落ち、散らばった塵が 44 本の腕に整列します。ずれは半径とともに蓄積するので、外側では次の良い近似 710/113 を軸に模様が組み替わります。それぞれの腕を破線状に途切れさせているのは、素数そのものの不規則さです。腕は算術が整っている場所、隙間はそうでない場所を表しています。',
        'その不規則さを可視化しているのが配色です。各星は直前の素数との間隔で色づけしてありますが、その間隔はその星の位置での平均的な間隔と比べて評価しているので、どこまで外側へ行っても読み方が変わりません。双子素数のように詰まった対は冷たい青白、異様に孤立した素数は暖色に燃えます。ほとんどの星は冷たい色で、わずかな暖色の星が記録的な間隔です。淡い点の集まりが単なるテクスチャに見えてしまうのを、その数個が防いでいます。',
        'seed は数学には触れません。素数はあるべき位置にあります。seed が動かすのは、スライダー 1 目盛りに満たない Twist のずれ、初期回転、そして星ごとの瞬きの位相だけです。それでも seed ごとに別の夜空になり、気に入った夜空はいつでも呼び戻せます。',
      ],
    },
    parameters: [
      {
        term: 'Primes',
        desc: {
          en: 'The upper bound n — every prime up to it is plotted, and the radius is scaled so the largest one lands on the rim. Raising it packs more stars into the same disc and pushes the fine ray structure inward.',
          ja: '上限 n です。これ以下のすべての素数を描き、最大のものが外周に来るよう半径を正規化します。上げるほど同じ円盤に星が密に詰まり、細かい光条の構造が内側に寄ります。',
        },
      },
      {
        term: 'Links',
        desc: {
          en: 'How many nearest neighbours each star reaches out to. Zero leaves a bare field of points; three closes the field into a connected web and makes the ray structure read as chains.',
          ja: '各星が結ぶ近傍の数です。0 なら点だけの星野に、3 まで上げると全体がつながった網になり、光条が鎖のように見えてきます。',
        },
      },
      {
        term: 'Twist',
        desc: {
          en: 'Radians of angle per unit of n. The main axis of the piece: 1.000 is the classic prime spiral, and moving away from it changes which rational approximation of 2π organises the rays — a few thousandths is enough to rebuild the whole sky.',
          ja: 'n 1 あたりの角度（ラジアン）です。この作品の主軸で、1.000 が古典的な素数螺旋です。ここから外れると、光条を組み立てる 2π の有理近似が入れ替わります。数千分の 1 動かすだけで夜空はまるごと組み替わります。',
        },
      },
      {
        term: 'Spin',
        desc: {
          en: 'Auto-rotation rate of the field. Set it to zero and rotate by dragging instead.',
          ja: '星図の自動回転の速さです。0 にすればドラッグで手動回転もできます。',
        },
      },
      {
        term: 'Grid',
        desc: {
          en: 'The polar reference grid — four rings and twelve spokes. It shows that the arms are not aligned to any drawn axis; turn it off for the bare sky.',
          ja: '極座標の参照グリッド（4 本の円と 12 本の放射線）です。腕がどの描かれた軸にも揃っていないことが分かります。消せば素の夜空になります。',
        },
      },
    ],
    tags: ['primes', 'polar', 'number-theory', 'prime-gaps', 'glow'],
  },
];

import type { Work } from './types';

export const WORKS: Work[] = [
  {
    slug: 'lorenz-attractor',
    label: 'Study',
    date: '2026-07-23',
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
  },
  {
    slug: 'prime-spiral',
    label: 'Study',
    date: '2026-07-26',
    title: { en: 'Prime Spiral Constellations', ja: '素数螺旋の星座' },
    description: {
      en: 'Every prime plotted in polar coordinates at radius p and angle p radians, revealed outward from the centre, linked to its nearest neighbours and coloured by the gap that precedes it.',
      ja: '半径 p・角度 p ラジアンの極座標にすべての素数を配置し、中心から外へ現れさせて近傍どうしを結び、直前の素数との間隔で色づけした星図。',
    },
    thumbPreview: {
      // The outward reveal *is* the piece — starting after it saturated left the
      // card looking like a field that only spins. Forward from 0 shows the
      // constellation drawing itself, and replays whenever the card scrolls back
      // in. Spin is left at the work's own default; forcing a period on it only
      // mattered when this looped, and one turn per 12 s read as frantic.
      mode: 'forward',
      startFrame: 0,
      posterFrame: 660,
      params: {
        nMax: 6000,
        kLinks: 2,
        showGrid: false,
      },
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
  },
  {
    slug: 'schotter',
    label: 'Tribute',
    date: '2026-07-26',
    title: { en: 'Schotter', ja: 'Schotter' },
    description: {
      en: "A perfect 12-column lattice that a fuzzy front descends through, breaking each square loose as it passes; Nees' 1968 print is one frame along the way.",
      ja: '完全な 12 列の格子を、ぼやけた前線が上から下へ通り抜け、通過した正方形を解き放っていきます。Nees の 1968 年の版画は、その途中にある 1 フレームです。',
    },
    about: {
      en: [
        "Georg Nees' Schotter is usually remembered as a field of randomly disturbed squares, but the real subject is the gradient. The top is a strict grid; the bottom collapses into gravel. Apply the same disorder to every row and the work loses the force that makes it legible.",
        'This version reads that gradient as time as well as space. Nees\' rowProgress² amplitude envelope is left intact; what changes is when each square breaks loose. The top rows break first and barely stir, so the visible destruction appears to fall through the field.',
        'Colour tracks how fast each square is moving right now. The collapse front shows up as a travelling band of warm light, but the band is never drawn directly. Light adds where wrecked outlines overlap, letting the broken lower rows flare on their own.',
        'The seed fixes every final offset, rotation, break-time jitter and drift phase, so a particular collapse can be found again. The source work is Georg Nees\' 1968 Schotter; this is a tribute to its order-to-disorder system, not a claim over the idea.',
      ],
      ja: [
        'Georg Nees の Schotter は、乱された正方形の集まりとして記憶されがちですが、本当の主題はその勾配です。上部は厳密な格子で、下部は砕石のように崩れます。すべての行に同じ乱れを与えると、作品を読ませている力が失われます。',
        'この版では、その勾配を空間だけでなく時間としても読み替えています。Nees の rowProgress² という振幅の包絡はそのまま残し、変えているのは各正方形がいつ解けるかです。上の行は先に解けてもほとんど動かないため、見える崩壊は画面を落ちていくように現れます。',
        '色は、それぞれの正方形が今どれだけ速く動いているかを追っています。崩壊の前線は暖かい光の帯として見えますが、その帯自体は描いていません。崩れた下部で輪郭が重なるほど光が加算され、自然に白熱します。',
        'seed は最終的なずれ、回転、破断時刻の揺らぎ、ドリフトの位相をすべて固定します。そのため、気に入った崩壊はもう一度呼び戻せます。参照元は Georg Nees の 1968 年の Schotter です。この作品は、秩序から無秩序へ移る仕組みへの Tribute（賛辞）です。',
      ],
    },
    parameters: [
      {
        term: 'Disorder',
        desc: {
          en: "The strength of Nees' displacement and rotation envelope. Zero keeps the lattice intact; higher values let the lower rows break further apart.",
          ja: 'Nees のずれと回転の包絡の強さです。0 では格子が保たれ、上げるほど下の行が大きく崩れます。',
        },
      },
      {
        term: 'Rows',
        desc: {
          en: 'How many rows are in the field. The whole lattice is refit to the canvas, so adding rows zooms out rather than squashing the squares.',
          ja: 'フィールド内の行数です。格子全体をキャンバスに合わせ直すため、行を増やすと正方形をつぶさずにズームアウトします。',
        },
      },
      {
        term: 'Fall',
        desc: {
          en: 'The speed of the collapse and recrystallising front. Higher values make the front pass faster; lower values stretch the transition.',
          ja: '崩壊し、再結晶する前線の速さです。上げるほど前線は速く通過し、下げるほど移行が引き伸ばされます。',
        },
      },
      {
        term: 'Drift',
        desc: {
          en: 'A post-collapse shimmer that keeps broken squares unsettled. It fades to zero with the collapse amount, so frame 0 remains a perfect lattice.',
          ja: '崩壊後の揺らめきです。崩壊量とともに 0 へ消えるため、フレーム 0 は完全な格子のままです。',
        },
      },
      {
        term: 'Trail',
        desc: {
          en: 'How many analytic ghost layers are redrawn from earlier frames. It shows recent motion without relying on canvas persistence.',
          ja: '過去フレームから解析的に描き直すゴースト層の数です。キャンバスの残像に頼らず、直前の動きを見せます。',
        },
      },
      {
        term: 'Lattice',
        desc: {
          en: 'A faint reference outline of the original perfect grid, useful for seeing what order the falling front is breaking.',
          ja: '元の完全な格子を薄く表示する参照線です。落ちていく前線が何を壊しているのかを見やすくします。',
        },
      },
    ],
    thumbPreview: {
      // [10, 729] rather than [0, 719]: the ghost trail bails out when
      // `n - k * GHOST_STEP` is negative, so frame 0 has no trail while 720 has a
      // full one. Any 720-long window starting at or after `ghosts * GHOST_STEP`
      // is bit-exact seamless — 729 -> 10 measures exactly 0.
      mode: 'loop',
      window: [10, 729],
      posterFrame: 300,
      params: { rows: 14, ghosts: 2, lattice: false },
    },
  },
];

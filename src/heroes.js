// Hero Definitions and Ability Specifications
export const HEROES = {
    soldier76: {
        id: 'soldier76',
        name: '솔저: 76',
        nameEn: 'Soldier: 76',
        role: '공격 (Damage)',
        portraitColor: '#2b6cb0',
        accentColor: '#3182ce',
        ultName: '전술 조준경',
        ultQuote: '목표를 포착했다!',
        maxHp: 200,
        armor: 0,
        speed: 13.0,
        sprintSpeed: 21.0,
        weapon: {
            name: '펄스 소총',
            type: 'hitscan',
            damage: 19,
            headshotMultiplier: 2.0,
            fireRate: 0.11, // seconds between shots
            ammoMax: 25,
            reloadTime: 1.5,
            spreadBase: 0.008,
            spreadMax: 0.035,
            recoilPitch: 0.015,
        },
        ability1: { // Shift
            name: '질주',
            key: 'Shift',
            type: 'toggle',
            icon: '🏃',
            description: '이동 속도가 크게 증가합니다.',
            cooldown: 0
        },
        ability2: { // E
            name: '생체장',
            key: 'E',
            type: 'deployable',
            icon: '➕',
            description: '주변 아군과 자신의 생명력을 지속적으로 회복하는 장을 설치합니다.',
            cooldown: 15.0,
            duration: 5.0,
            radius: 5.0,
            healPerSecond: 40.0
        },
        secondary: { // Right Click
            name: '나선 로켓',
            key: '우클릭',
            type: 'projectile',
            icon: '🚀',
            description: '소총에서 나선형으로 회전하는 3발의 소형 로켓을 발사하여 폭발 피해를 줍니다.',
            cooldown: 6.0,
            directDamage: 120,
            splashDamage: 40,
            splashRadius: 3.5,
            speed: 55
        },
        ultimate: { // Q
            name: '전술 조준경',
            key: 'Q',
            icon: '👁️',
            description: '시야 내에 있는 가장 가까운 적에게 자동으로 조준이 고정되고 재장전 속도가 빨라집니다.',
            duration: 6.0,
            cost: 100
        }
    },

    tracer: {
        id: 'tracer',
        name: '트레이서',
        nameEn: 'Tracer',
        role: '공격 (Damage)',
        portraitColor: '#dd6b20',
        accentColor: '#ed8936',
        ultName: '펄스 폭탄',
        ultQuote: '폭탄 받아라!',
        maxHp: 150,
        armor: 0,
        speed: 15.0,
        weapon: {
            name: '펄스 쌍권총',
            type: 'hitscan_rapid',
            damage: 6, // 2 bullets per shot = 12 dmg
            headshotMultiplier: 2.0,
            fireRate: 0.05,
            ammoMax: 40,
            reloadTime: 1.15,
            spreadBase: 0.032,
            spreadMax: 0.055,
            recoilPitch: 0.008,
        },
        ability1: { // Shift or Right Click
            name: '점멸',
            key: 'Shift / 우클릭',
            type: 'charges',
            maxCharges: 3,
            chargeTime: 3.0,
            distance: 8.5,
            icon: '⚡',
            description: '이동하는 방향으로 순간 이동합니다. (최대 3회 충전)',
            cooldown: 3.0
        },
        ability2: { // E
            name: '시간 역행',
            key: 'E',
            type: 'instant',
            icon: '⏳',
            description: '3초 전의 위치와 생명력으로 되돌아가며 탄약을 즉시 재장전합니다.',
            cooldown: 12.0
        },
        ultimate: { // Q
            name: '펄스 폭탄',
            key: 'Q',
            icon: '💣',
            description: '부착 가능한 강력한 펄스 폭탄을 던집니다. 1.5초 후 대폭발을 일으킵니다.',
            damage: 350,
            radius: 4.5,
            fuseTime: 1.5,
            cost: 100
        }
    },

    genji: {
        id: 'genji',
        name: '겐지',
        nameEn: 'Genji',
        role: '공격 (Damage)',
        portraitColor: '#38a169',
        accentColor: '#48bb78',
        ultName: '용검',
        ultQuote: '류진노 켄오 쿠라에!',
        maxHp: 200,
        armor: 0,
        speed: 14.5,
        doubleJump: true,
        weapon: {
            name: '수리검',
            type: 'projectile',
            damage: 27,
            headshotMultiplier: 2.0,
            fireRate: 0.75, // left click 3-burst
            secondaryRate: 0.55, // right click fan of 3
            ammoMax: 24,
            reloadTime: 1.4,
            projectileSpeed: 60,
        },
        ability1: { // Shift
            name: '질풍참',
            key: 'Shift',
            type: 'dash_attack',
            icon: '🗡️',
            description: '전방으로 빠르게 돌진하여 적들을 베어 50의 피해를 줍니다. 처치 시 재사용 대기시간이 즉시 초기화됩니다!',
            cooldown: 8.0,
            damage: 50,
            distance: 14.0
        },
        ability2: { // E
            name: '튕겨내기',
            key: 'E',
            type: 'shield_deflect',
            icon: '🛡️',
            description: '빛의 속도로 검을 휘둘러 날아오는 적의 투사체를 조준점 방향으로 튕겨냅니다.',
            cooldown: 8.0,
            duration: 2.0
        },
        ultimate: { // Q
            name: '용검',
            key: 'Q',
            icon: '🐉',
            description: '용의 힘이 깃든 검을 뽑아 휘두릅니다. 넓은 범위의 적에게 일격당 110의 강력한 피해를 입힙니다.',
            duration: 6.0,
            slashDamage: 110,
            slashRange: 5.5,
            slashCooldown: 0.8,
            cost: 100
        }
    }
};

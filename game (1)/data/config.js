window.LOBSTER_GAME_CONFIG = {
  "controls": {
    "movement": "WASD / arrows",
    "look": "mouse",
    "interact": "E",
    "jumpAndRhythm": "Space",
    "wrap": "R",
    "throwAndSelect": "left mouse",
    "pause": "Escape",
    "pointerLock": true,
    "clearHeldInputsOnPause": true,
    "requireFreshPressForRhythm": true,
    "stilts": "Q left foot / E right foot, alternate on the beat",
    "crossbow": "Mouse or drag to aim; left click / Space / touch fire"
  },
  "difficulty": {
    "default": "Noob",
    "order": [
      "Noob",
      "Pro",
      "Hacker",
      "God"
    ],
    "levels": {
      "Noob": {
        "powerCycleSeconds": 3,
        "perfectWindowMs": 120,
        "greatWindowMs": 200,
        "goodWindowMs": 300,
        "aimAssistDegrees": 7,
        "aiStrength": 0.25
      },
      "Pro": {
        "powerCycleSeconds": 2.4,
        "perfectWindowMs": 80,
        "greatWindowMs": 140,
        "goodWindowMs": 220,
        "aimAssistDegrees": 3,
        "aiStrength": 0.5
      },
      "Hacker": {
        "powerCycleSeconds": 1.8,
        "perfectWindowMs": 55,
        "greatWindowMs": 100,
        "goodWindowMs": 160,
        "aimAssistDegrees": 0,
        "aiStrength": 0.75
      },
      "God": {
        "powerCycleSeconds": 1.3,
        "perfectWindowMs": 35,
        "greatWindowMs": 70,
        "goodWindowMs": 110,
        "aimAssistDegrees": 0,
        "aiStrength": 0.95
      }
    },
    "assistance": {
      "Noob": {
        "tutorialPrompts": true,
        "trajectoryVisible": true
      },
      "Pro": {
        "tutorialPrompts": false,
        "trajectoryVisible": true
      },
      "Hacker": {
        "tutorialPrompts": false,
        "trajectoryVisible": true
      },
      "God": {
        "tutorialPrompts": false,
        "trajectoryVisible": true
      }
    }
  },
  "progression": {
    "activityOrder": [
      "top",
      "quan",
      "con",
      "push",
      "sap",
      "stilts",
      "crossbow"
    ],
    "freeVisitOrder": true,
    "stampsRequired": 7,
    "uniqueStamps": true,
    "stampLifetime": "festival-session",
    "retainStampsOnFailure": true,
    "retainStampsOnActivityRetry": true,
    "completionState": "festival-complete",
    "continueExploringAfterCompletion": true,
    "globalTimeLimitSeconds": null,
    "festivalRestart": {
      "targetState": "ready",
      "clearStamps": true,
      "clearActiveActivity": true,
      "clearSessionRecords": true,
      "preserveExternalRecords": true,
      "preserveMute": true
    }
  },
  "accessibility": {
    "instructionsLanguage": "en",
    "showInteractionTarget": true,
    "showTimingGrades": true,
    "visibleMute": true,
    "focusVisible": true,
    "highContrastChalk": true,
    "keyboardButtons": true,
    "pauseOnPointerLockLoss": true,
    "minTextSizePx": 14,
    "contentSafeInsetPx": 12
  },
  "simulation": {
    "simulation": "fixed-step",
    "stepHz": 60,
    "maxFrameDeltaMs": 250,
    "maxSubSteps": 5
  },
  "spatial": {
    "worldUp": "y",
    "visualForward": "local -Z",
    "controlFrame": "camera-horizontal",
    "movementSpace": "planar",
    "collision": {
      "authority": "gameplay",
      "model": "All solids mutually block including same-role dynamic bodies. Ground supports walking and equipment; world boundary, buildings, gate posts, banyan trunk and booth fixtures block traversal. Tops collide using gameplay-owned velocities, angular spin and contact-onset resolution. Balls are solid projectiles; interaction zones, ring aperture, dance clamps and push boundary are non-blocking triggers. Cloth, held visuals, chalk and transient debris are decorative and do not create extra gameplay bodies.",
      "bodyRoles": [
        {
          "role": "world-floor",
          "kind": "solid",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "world-boundary",
          "kind": "solid",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "village-building",
          "kind": "solid",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "gate-post",
          "kind": "solid",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "banyan-trunk",
          "kind": "solid",
          "shape": "capsule",
          "mobility": "static"
        },
        {
          "role": "booth-fixture",
          "kind": "solid",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "player",
          "kind": "solid",
          "shape": "capsule",
          "mobility": "dynamic"
        },
        {
          "role": "ai-participant",
          "kind": "solid",
          "shape": "capsule",
          "mobility": "dynamic"
        },
        {
          "role": "top-projectile",
          "kind": "solid",
          "shape": "sphere",
          "mobility": "dynamic"
        },
        {
          "role": "con-projectile",
          "kind": "solid",
          "shape": "sphere",
          "mobility": "dynamic"
        },
        {
          "role": "equipment-pickup",
          "kind": "trigger",
          "shape": "sphere",
          "mobility": "dynamic"
        },
        {
          "role": "activity-entry",
          "kind": "trigger",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "con-aperture",
          "kind": "trigger",
          "shape": "box",
          "mobility": "static"
        },
        {
          "role": "push-boundary",
          "kind": "trigger",
          "shape": "sphere",
          "mobility": "static"
        },
        {
          "role": "sap-clamp",
          "kind": "trigger",
          "shape": "box",
          "mobility": "dynamic"
        },
        {
          "role": "sap-finish",
          "kind": "trigger",
          "shape": "box",
          "mobility": "static"
        }
      ]
    }
  },
  "camera": {
    "projection": "perspective",
    "mode": "first-person",
    "fieldOfViewDegrees": 70,
    "near": 0.08,
    "far": 180,
    "mouseSensitivity": 0.002,
    "pitchLimitsDegrees": [
      -80,
      80
    ],
    "pointerMode": "relative-delta",
    "reticleFraming": "none",
    "board": {
      "offset": [
        0,
        7,
        0.01
      ],
      "lookAt": [
        0,
        0,
        0
      ]
    },
    "push": {
      "offset": [
        -3,
        2.5,
        5
      ],
      "lookAt": [
        0,
        1,
        0
      ]
    }
  },
  "player": {
    "spawn": {
      "position": [
        0,
        0,
        25
      ],
      "yawRadians": 0,
      "pitchRadians": 0
    },
    "walkSpeed": 4.5,
    "radius": 0.32,
    "height": 1.75,
    "eyeHeight": 1.6,
    "jumpSpeed": 5.2,
    "gravity": 9.81,
    "interactionReach": 2.6,
    "inventoryCapacity": 1,
    "heldItemOffset": [
      0.32,
      -0.35,
      -0.65
    ],
    "saveExplorationPoseOnActivityEntry": true,
    "restoreExplorationPoseOnExit": true
  },
  "world": {
    "bounds": {
      "min": [
        -39,
        -2,
        -32
      ],
      "max": [
        39,
        20,
        32
      ]
    },
    "groundY": 0,
    "gate": {
      "position": [
        0,
        0,
        28
      ],
      "openingWidth": 6,
      "postWidth": 0.8
    },
    "banyan": {
      "position": [
        -6,
        0,
        0
      ],
      "trunkRadius": 1.1
    },
    "pavilion": {
      "position": [
        22,
        0,
        -23
      ],
      "size": [
        8,
        6,
        7
      ]
    },
    "paths": [
      {
        "from": [
          0,
          0,
          25
        ],
        "to": [
          0,
          0,
          -16
        ],
        "width": 4
      },
      {
        "from": [
          0,
          0,
          10
        ],
        "to": [
          -16,
          0,
          10
        ],
        "width": 3
      },
      {
        "from": [
          0,
          0,
          10
        ],
        "to": [
          16,
          0,
          10
        ],
        "width": 3
      },
      {
        "from": [
          0,
          0,
          -10
        ],
        "to": [
          -16,
          0,
          -7
        ],
        "width": 3
      },
      {
        "from": [
          0,
          0,
          -10
        ],
        "to": [
          16,
          0,
          -10
        ],
        "width": 3
      }
    ],
    "lighting": {
      "skyColor": "#bce5ed",
      "groundColor": "#b88f5d",
      "sunColor": "#ffe2ac",
      "sunPosition": [
        -18,
        32,
        12
      ],
      "ambientIntensity": 0.85
    },
    "palette": {
      "wood": "#8d542e",
      "bamboo": "#a7a857",
      "limewash": "#f1e8cd",
      "terracotta": "#b85a3d",
      "cloth": "#f2e2b7",
      "red": "#cd453b",
      "yellow": "#edc54b",
      "teal": "#3c8f89",
      "chalk": "#fff4d6"
    }
  },
  "activities": [
    {
      "id": "top",
      "name": "Đánh Cù",
      "position": [
        -20,
        0,
        10
      ],
      "entryPosition": [
        -16,
        0,
        10
      ],
      "radius": 4,
      "cameraMode": "first-person",
      "stampCondition": "outlast-ai",
      "equipment": "wooden-top",
      "equipmentPosition": [
        -15,
        0,
        14
      ],
      "instructions": "Take a top from the chest with E. Hold R to wrap, then charge and release. Retrieve a stopped top on foot; replace a broken top at the chest."
    },
    {
      "id": "quan",
      "name": "Ô Ăn Quan",
      "position": [
        20,
        0,
        10
      ],
      "entryPosition": [
        16,
        0,
        10
      ],
      "radius": 3,
      "cameraMode": "overhead",
      "stampCondition": "win",
      "equipment": null,
      "instructions": "Choose a nonempty pit on your side, select a direction, then confirm. Win by collecting the greater final value."
    },
    {
      "id": "con",
      "name": "Ném Còn",
      "position": [
        -20,
        0,
        -10
      ],
      "entryPosition": [
        -16,
        0,
        -7
      ],
      "radius": 4,
      "cameraMode": "first-person",
      "stampCondition": "at-least-one-hit",
      "equipment": "con-ball",
      "equipmentPosition": [
        -15,
        0,
        -7
      ],
      "instructions": "Collect one ball with E. Hold left mouse to charge and aim at the ring, then release. Collect another ball between throws; score at least once in ten throws."
    },
    {
      "id": "push",
      "name": "Đẩy Gậy",
      "position": [
        20,
        0,
        -10
      ],
      "entryPosition": [
        16,
        0,
        -10
      ],
      "radius": 3,
      "cameraMode": "over-the-shoulder",
      "stampCondition": "opponent-outside-circle",
      "equipment": "bamboo-staff",
      "instructions": "Press E at the staff to grip. Tap Space once per beat. Accurate timing pushes your opponent toward the chalk boundary."
    },
    {
      "id": "sap",
      "name": "Nhảy Sạp",
      "position": [
        0,
        0,
        -21
      ],
      "entryPosition": [
        0,
        0,
        -16
      ],
      "radius": 3,
      "cameraMode": "first-person",
      "stampCondition": "reach-finish",
      "equipment": null,
      "instructions": "Bấm D / F / J / K hiện trong vòng tròn đúng lúc để bước sang ô tiếp theo. Không nhảy; lỡ nhịp sẽ bị kẹp chân và đi lại."
    },
    {
      "id": "stilts",
      "name": "Đi Cà Kheo",
      "position": [
        8,
        0,
        10
      ],
      "entryPosition": [
        6,
        0,
        23
      ],
      "radius": 2,
      "cameraMode": "over-the-shoulder",
      "stampCondition": "reach-finish",
      "equipment": null,
      "instructions": "Luân phiên Q (chân trái) và E (chân phải) đúng nhịp khi vòng tròn khép lại. Sai chân hoặc lệch nhịp sẽ ngã. Đi hết đường để nhận dấu."
    },
    {
      "id": "crossbow",
      "name": "Bắn Nỏ",
      "position": [
        -33,
        0,
        -15
      ],
      "entryPosition": [
        -30,
        0,
        14
      ],
      "radius": 2,
      "cameraMode": "first-person",
      "stampCondition": "center-hit-quota",
      "equipment": null,
      "instructions": "Di chuột hoặc vuốt để ngắm vào tâm vàng của bia 3D. Bấm chuột trái / Space hoặc nút BẮN để bắn. Chỉ trúng tâm vàng mới tính điểm. Noob: 3/5 · Pro: 3/3 · Hacker: 5/5 · God: 7/7."
    }
  ],
  "top": {
    "arenaActivityId": "top",
    "arenaRadius": 4,
    "wrapSeconds": 1.5,
    "power": {
      "minSpeed": 3,
      "maxSpeed": 10,
      "curve": "triangle",
      "cycleFromDifficulty": "powerCycleSeconds"
    },
    "radius": 0.16,
    "mass": 0.3,
    "restitution": 0.6,
    "groundFriction": 0.55,
    "initialSpinRadiansPerSecond": {
      "min": 28,
      "max": 60
    },
    "spinDecayRadiansPerSecondSquared": 2.4,
    "stopSpinThreshold": 0.8,
    "wobbleStartsBelowSpin": 12,
    "breakProbability": 0.05,
    "breakRollMode": "new-pair-contact-only",
    "debrisCount": {
      "min": 2,
      "max": 3
    },
    "aiCount": 1,
    "aiLaunchDelaySeconds": 0.6,
    "aiSpinFactorRange": [
      0.6,
      0.98
    ],
    "requireWrapEveryLaunch": true,
    "stoppedRetrieval": "walk-and-E",
    "brokenReplacement": "chest-only",
    "autoRetrieve": false
  },
  "quan": {
    "smallPitCountPerSide": 5,
    "smallPitStartingPebbles": 5,
    "mandarinPitCount": 2,
    "mandarinsPerEnd": 1,
    "mandarinValue": 10,
    "cellOrder": [
      "south-0",
      "south-1",
      "south-2",
      "south-3",
      "south-4",
      "east-mandarin",
      "north-4",
      "north-3",
      "north-2",
      "north-1",
      "north-0",
      "west-mandarin"
    ],
    "playerPits": [
      0,
      1,
      2,
      3,
      4
    ],
    "aiPits": [
      6,
      7,
      8,
      9,
      10
    ],
    "mandarinPits": [
      5,
      11
    ],
    "directions": [
      {
        "id": "clockwise",
        "delta": 1
      },
      {
        "id": "counter-clockwise",
        "delta": -1
      }
    ],
    "requireMoveConfirmation": false,
    "sowIntervalSeconds": 0.32,
    "captureIntervalSeconds": 0.48,
    "lockInputDuringAnimation": true,
    "rules": {
      "relayFromNonemptySmallNext": true,
      "relayFromMandarin": false,
      "captureAcrossSingleEmpty": true,
      "continueAlternatingCaptures": true,
      "stopOnConsecutiveEmpties": true,
      "refillEmptyRowPerPit": 1,
      "borrowRefillShortfall": true,
      "repayDebtAtSettlement": true,
      "endWhenBothMandarinCellsEmpty": true,
      "collectOwnSideRemainderAtEnd": true,
      "tieResult": "draw"
    },
    "opponents": [
      {
        "id": "villager-lan",
        "displayName": "Lan"
      },
      {
        "id": "villager-minh",
        "displayName": "Minh"
      },
      {
        "id": "villager-an",
        "displayName": "An"
      }
    ],
    "initialOpponentId": "villager-lan",
    "ai": {
      "legalMovesOnly": true,
      "hiddenInformation": false,
      "searchDepthByDifficulty": {
        "Noob": 1,
        "Pro": 1,
        "Hacker": 3,
        "God": 4
      },
      "randomMoveChanceByDifficulty": {
        "Noob": 1,
        "Pro": 0.3,
        "Hacker": 0,
        "God": 0
      },
      "thinkSecondsByDifficulty": {
        "Noob": 1.4,
        "Pro": 1.1,
        "Hacker": 0.8,
        "God": 0.6
      }
    },
    "streak": {
      "consecutiveSameOpponentWinLimit": 1,
      "resetOnLoss": true,
      "showCountedReason": true,
      "identityStableDuringMatch": true
    }
  },
  "con": {
    "throwsPerRound": 10,
    "stampHitsRequired": 1,
    "scorePerHit": 1,
    "finalScoreRange": [
      0,
      10
    ],
    "countAllMissesResult": true,
    "gravity": 9.81,
    "ballRadius": 0.13,
    "launchHeight": 1.4,
    "power": {
      "minSpeed": 6,
      "maxSpeed": 16,
      "curve": "triangle",
      "cycleFromDifficulty": "powerCycleSeconds"
    },
    "ring": {
      "position": [
        -20,
        5.5,
        -18
      ],
      "normal": [
        0,
        0,
        1
      ],
      "innerRadius": 0.8,
      "poleHeight": 6.5
    },
    "throwLine": {
      "position": [
        -20,
        0,
        -9
      ],
      "width": 3
    },
    "trajectory": {
      "stepSeconds": 0.05,
      "maxSeconds": 3
    },
    "scoring": {
      "method": "swept-plane-aperture",
      "oncePerThrow": true,
      "requireBallClearance": true
    },
    "settleSpeed": 0.3,
    "settleSeconds": 0.5,
    "maxFlightSeconds": 8,
    "bounceRestitution": 0.25,
    "collectBetweenThrows": true,
    "records": [
      "sessionTotalHits",
      "bestTenThrowScore",
      "currentHitStreak",
      "bestHitStreak"
    ],
    "leaderboardTerminalState": "con-result"
  },
  "push": {
    "circleRadius": 3,
    "staffLength": 2.6,
    "gripHeight": 1.05,
    "initialDisplacement": 0,
    "bpm": 100,
    "countInBeats": 4,
    "noteLeadBeats": 3,
    "input": "Space",
    "onePressPerNote": true,
    "grades": [
      "Perfect",
      "Great",
      "Good",
      "Miss"
    ],
    "timingFromDifficulty": true,
    "pushMeters": {
      "Perfect": 0.5,
      "Great": 0.36,
      "Good": 0.2,
      "Miss": -0.25
    },
    "ai": {
      "beatAccuracyRange": [
        0.22,
        0.88
      ],
      "oppositionMetersPerBeat": 0.22,
      "strengthFromDifficulty": "aiStrength",
      "readsFutureInput": false
    },
    "participantHalfSeparation": 1.1,
    "exitDisplacement": 1.9,
    "resultAuthority": "participant-crosses-circle",
    "timeLimitSeconds": null
  },
  "sap": {
    "bpm": 100,
    "countInBeats": 4,
    "beatCycle": [
      "open",
      "open",
      "close",
      "recover"
    ],
    "laneWidth": 1.4,
    "trackLength": 8,
    "polePairs": 4,
    "pairSpacing": 2,
    "startPosition": [
      0,
      0,
      -17
    ],
    "finishPosition": [
      0,
      0,
      -25
    ],
    "forward": [
      0,
      0,
      -1
    ],
    "openGap": 1.2,
    "closedGap": 0.08,
    "poleRadius": 0.055,
    "closureFractionOfBeat": 0.28,
    "cues": [
      {
        "beat": 0,
        "action": "ArrowUp"
      },
      {
        "beat": 1,
        "action": "Space"
      },
      {
        "beat": 2,
        "action": "airborne-or-outside-clamp"
      },
      {
        "beat": 3,
        "action": "recover"
      }
    ],
    "stepDistance": 1,
    "jumpHeight": 0.75,
    "jumpDurationSeconds": 0.7,
    "clampClearanceHeight": 0.22,
    "stumbleSeconds": 0.9,
    "resetOnClosure": true,
    "visibleStumble": true,
    "tripRemovesStamps": false
  },
  "records": {
    "scope": "session",
    "persistExternalHighestScore": true
  },
  "ui": {
    "objective": "Earn all seven festival stamps.",
    "readyTitle": "Lễ Hội Trò Chơi Dân Gian Miền Quê Việt Nam",
    "startLabel": "Enter the festival",
    "retryLabel": "Retry activity",
    "returnLabel": "Return to village",
    "restartLabel": "Restart festival",
    "completeTitle": "Seven stamps — festival complete!",
    "completeDescription": "Celebrate, keep exploring, or replay any activity.",
    "failureHint": "Your earned stamps are safe. Try again.",
    "networkWarning": "Online records are unavailable. You can keep playing."
  },
  "title": "Lễ Hội Trò Chơi Dân Gian Miền Quê Việt Nam",
  "gameType": "first-person-folk-festival",
  "renderMode": "threejs-3d",
  "inGameLanguage": "en",
  "presentation": {
    "orientation": "landscape",
    "viewportMode": "fill"
  },
  "leaderboard": {
    "enabled": true,
    "scoreLabel": "Ring hits",
    "submitStates": [
      "con-result"
    ],
    "gameId": "game_0fd09d6f-704b-4560-9ad2-6b98d3346e83"
  },
  "audio": {
    "requiredEvents": [
      "footstep",
      "jump",
      "land",
      "pickup",
      "equip",
      "whoosh",
      "hit",
      "break",
      "dig",
      "clap",
      "alert",
      "victory",
      "ui-click",
      "ambience"
    ],
    "bgm": {
      "loop": true,
      "volume": 0.08,
      "source": "creator-provided",
      "url": "https://resource.utdownload.com/soonlab/game-audio/2026-11-10/a985cb9f-c571-4cc9-9547-1ded3940dae1.mp3",
      "mimeType": "audio/mpeg"
    },
    "sfx": {
      "volume": 0.22,
      "clips": {
        "footstep": {
          "gain": 0.35,
          "cooldownMs": 120,
          "polyphony": 2,
          "fallbackTone": {
            "from": 150,
            "to": 105,
            "duration": 0.06,
            "type": "triangle"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/character-actions/earth-female-footstep-foot-movement-01/earth-female-footstep-foot-movement-01.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "a4d2c141ff1bd97912933f5a",
            "versionId": "d0a2b3e6d9956a968488b373",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/character-actions/earth-female-footstep-foot-movement-01/earth-female-footstep-foot-movement-01.wav",
            "sizeBytes": 27908
          },
          "source": "oss"
        },
        "jump": {
          "gain": 0.65,
          "cooldownMs": 90,
          "polyphony": 2,
          "fallbackTone": {
            "from": 300,
            "to": 560,
            "duration": 0.09,
            "type": "sine"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/character-actions/phasejump3/phasejump3.ogg",
          "mimeType": "audio/ogg",
          "oss": {
            "kind": "audio",
            "assetId": "2967adcb3f8262710a692e64",
            "versionId": "bb68f1c13168b6d090e1a70c",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/character-actions/phasejump3/phasejump3.ogg",
            "sizeBytes": 6854
          },
          "source": "oss"
        },
        "land": {
          "gain": 0.55,
          "cooldownMs": 90,
          "polyphony": 2,
          "fallbackTone": {
            "from": 145,
            "to": 75,
            "duration": 0.09,
            "type": "triangle"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/character-actions/earth-female-footstep-land-foot-movement-01/earth-female-footstep-land-foot-movement-01.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "7d76e0204f28e0581d7bc587",
            "versionId": "c3cbe5341ee8a8a5edbcadc9",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/character-actions/earth-female-footstep-land-foot-movement-01/earth-female-footstep-land-foot-movement-01.wav",
            "sizeBytes": 22744
          },
          "source": "oss"
        },
        "pickup": {
          "gain": 0.75,
          "cooldownMs": 50,
          "polyphony": 4,
          "fallbackTone": {
            "from": 520,
            "to": 820,
            "duration": 0.1,
            "type": "triangle"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/items-and-rewards/small-wood-pickup/small-wood-pickup.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "77c0039f50997b74a9d4856d",
            "versionId": "ddd18051ed4f19ffac2ae781",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/items-and-rewards/small-wood-pickup/small-wood-pickup.wav",
            "sizeBytes": 13100
          },
          "source": "oss"
        },
        "equip": {
          "gain": 0.65,
          "cooldownMs": 100,
          "polyphony": 2,
          "fallbackTone": {
            "from": 260,
            "to": 390,
            "duration": 0.08,
            "type": "triangle"
          },
          "source": "synth"
        },
        "whoosh": {
          "gain": 0.6,
          "cooldownMs": 60,
          "polyphony": 3,
          "fallbackTone": {
            "from": 650,
            "to": 160,
            "duration": 0.14,
            "type": "sine"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/environment-and-nature/whoosh-05/whoosh-05.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "930a2d345ab3ac937c3b46d5",
            "versionId": "efc337eada465d5a32b1a052",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/environment-and-nature/whoosh-05/whoosh-05.wav",
            "sizeBytes": 175152
          },
          "source": "oss"
        },
        "hit": {
          "gain": 0.9,
          "cooldownMs": 80,
          "polyphony": 3,
          "fallbackTone": {
            "from": 180,
            "to": 90,
            "duration": 0.1,
            "type": "sawtooth"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/weapons-and-combat/hit-wood-06/hit-wood-06.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "2a4ac9b9857d56a4333ba3dc",
            "versionId": "6d0fc0aeb64ea1ba4c7cc7c2",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/weapons-and-combat/hit-wood-06/hit-wood-06.wav",
            "sizeBytes": 32236
          },
          "source": "oss"
        },
        "break": {
          "gain": 0.75,
          "cooldownMs": 50,
          "polyphony": 4,
          "fallbackTone": {
            "from": 440,
            "to": 60,
            "duration": 0.12,
            "type": "sawtooth"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/mechanisms-and-machinery/wood-break/wood-break.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "8fa6095e45c1e5e80434487b",
            "versionId": "79c6a5acba9f7fbea2bec2cc",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/mechanisms-and-machinery/wood-break/wood-break.wav",
            "sizeBytes": 358292
          },
          "source": "oss"
        },
        "dig": {
          "gain": 0.75,
          "cooldownMs": 50,
          "polyphony": 4,
          "fallbackTone": {
            "from": 150,
            "to": 80,
            "duration": 0.12,
            "type": "triangle"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/skills-and-magic/stone-object-sound/stone-object-sound.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "17f4ae85eab284872126d91d",
            "versionId": "fa73a5e901add1eca4bbaabd",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/skills-and-magic/stone-object-sound/stone-object-sound.wav",
            "sizeBytes": 33856
          },
          "source": "oss"
        },
        "clap": {
          "gain": 0.75,
          "cooldownMs": 50,
          "polyphony": 4,
          "fallbackTone": {
            "from": 520,
            "to": 90,
            "duration": 0.06,
            "type": "sawtooth"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/weapons-and-combat/hit-wood-06/hit-wood-06.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "2a4ac9b9857d56a4333ba3dc",
            "versionId": "6d0fc0aeb64ea1ba4c7cc7c2",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/weapons-and-combat/hit-wood-06/hit-wood-06.wav",
            "sizeBytes": 32236
          },
          "source": "oss"
        },
        "alert": {
          "gain": 0.7,
          "cooldownMs": 150,
          "polyphony": 2,
          "fallbackTone": {
            "from": 880,
            "to": 660,
            "duration": 0.14,
            "type": "square"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/interface-interactions/alert-click-failure-mouse-ui-feedback/alert-click-failure-mouse-ui-feedback.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "68e26e84fe5b5009341ba25e",
            "versionId": "7eec72125a16492487039850",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/interface-interactions/alert-click-failure-mouse-ui-feedback/alert-click-failure-mouse-ui-feedback.wav",
            "sizeBytes": 27206
          },
          "source": "oss"
        },
        "victory": {
          "gain": 0.9,
          "cooldownMs": 250,
          "polyphony": 2,
          "fallbackTone": {
            "from": 520,
            "to": 1040,
            "duration": 0.2,
            "type": "triangle"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/states-and-results/victory-complete-01/victory-complete-01.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "2e8130d26e2a210cc21b0b74",
            "versionId": "c2ea7cd6fbebdff50dd5d9b1",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/states-and-results/victory-complete-01/victory-complete-01.wav",
            "sizeBytes": 55340
          },
          "source": "oss"
        },
        "ui-click": {
          "gain": 0.55,
          "cooldownMs": 70,
          "polyphony": 2,
          "fallbackTone": {
            "from": 420,
            "to": 520,
            "duration": 0.05,
            "type": "sine"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/interface-interactions/switch-02/switch-02.ogg",
          "mimeType": "audio/ogg",
          "oss": {
            "kind": "audio",
            "assetId": "00535b5ac1fe6e8570557f6e",
            "versionId": "d3c783c26c64d54aa2bf9a19",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/interface-interactions/switch-02/switch-02.ogg",
            "sizeBytes": 22050
          },
          "source": "oss"
        },
        "ambience": {
          "gain": 0.75,
          "cooldownMs": 50,
          "polyphony": 4,
          "fallbackTone": {
            "from": 110,
            "to": 110,
            "duration": 0.2,
            "type": "sine"
          },
          "url": "https://ssr.iappsign.com/soonlab/game-materials/game-sfx/environment-and-nature/voice-wind-08/voice-wind-08.wav",
          "mimeType": "audio/wav",
          "oss": {
            "kind": "audio",
            "assetId": "7a497aa42ff7e673c669b6c0",
            "versionId": "036dc2aec31957f0206b9613",
            "artifactId": "source",
            "objectKey": "soonlab/game-materials/game-sfx/environment-and-nature/voice-wind-08/voice-wind-08.wav",
            "sizeBytes": 5021740
          },
          "source": "oss"
        }
      }
    },
    "sceneMusic": {
      "push": {
        "source": "creator-provided",
        "url": "https://resource.utdownload.com/soonlab/game-audio/2026-11-10/dbb08609-e29e-4bea-bbbd-f4959fa7c54f.mp3",
        "mimeType": "audio/mpeg"
      },
      "top": {
        "source": "creator-provided",
        "url": "https://resource.utdownload.com/soonlab/game-audio/2026-11-10/61728ad1-37e5-49da-93fb-611b45dde8ab.mp3",
        "mimeType": "audio/mpeg"
      },
      "quan": {
        "source": "creator-provided",
        "url": "https://resource.utdownload.com/soonlab/game-audio/2026-11-10/94c7ad9e-45c3-4770-ac9a-9fe7484974a2.mp3",
        "mimeType": "audio/mpeg"
      },
      "defeat": {
        "source": "creator-provided",
        "url": "https://resource.utdownload.com/soonlab/game-audio/2026-11-10/f5c2ce5d-8db6-4e6c-be2e-dde1fb075d25.mp3",
        "mimeType": "audio/mpeg"
      },
      "con": {
        "source": "creator-provided",
        "url": "https://resource.utdownload.com/soonlab/game-audio/2026-11-10/94c7ad9e-45c3-4770-ac9a-9fe7484974a2.mp3",
        "mimeType": "audio/mpeg"
      }
    }
  },
  "stilts": {
    "startPosition": [
      8,
      0,
      22
    ],
    "steps": [
      12,
      16,
      20,
      24
    ],
    "periodSeconds": [
      0.9,
      0.78,
      0.66,
      0.56
    ],
    "windowSeconds": [
      0.22,
      0.17,
      0.13,
      0.1
    ],
    "stepDistance": 1
  },
  "crossbow": {
    "startPosition": [
      -33,
      0,
      12
    ],
    "targetPosition": [
      -33,
      1.65,
      -15
    ],
    "centerRadius": 0.4,
    "requiredHits": [
      3,
      3,
      5,
      7
    ],
    "arrowCounts": [
      5,
      3,
      5,
      7
    ],
    "arrowSpeed": 45,
    "reloadSeconds": 0.85,
    "distanceByDifficulty": [
      27,
      27,
      34,
      40
    ],
    "motionAmplitudeByDifficulty": [
      0,
      0,
      1.5,
      1.5
    ],
    "motionSpeedByDifficulty": [
      0,
      0,
      0.9,
      1.6
    ]
  }
};

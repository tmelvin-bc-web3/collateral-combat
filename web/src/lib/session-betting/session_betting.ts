/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/session_betting.json`.
 */
export type SessionBetting = {
  "address": "4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA",
  "metadata": {
    "name": "sessionBetting",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimWinnings",
      "docs": [
        "Claim winnings after round is settled",
        "Can use session key OR wallet signature",
        "Winnings go to user's balance account (not direct wallet)"
      ],
      "discriminator": [
        161,
        215,
        24,
        59,
        14,
        236,
        242,
        221
      ],
      "accounts": [
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "round",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "userBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user_balance.owner",
                "account": "userBalance"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              },
              {
                "kind": "account",
                "path": "user_balance.owner",
                "account": "userBalance"
              }
            ]
          }
        },
        {
          "name": "sessionToken",
          "docs": [
            "Session token for session key authentication (optional)"
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user_balance.owner",
                "account": "userBalance"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createSession",
      "docs": [
        "Create a session token that authorizes a temporary key to act on behalf of the user",
        "REQUIRES wallet signature to create the session"
      ],
      "discriminator": [
        242,
        193,
        143,
        179,
        150,
        25,
        122,
        227
      ],
      "accounts": [
        {
          "name": "sessionToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "sessionSigner"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionSigner"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "validUntil",
          "type": "i64"
        }
      ]
    },
    {
      "name": "deposit",
      "docs": [
        "Deposit SOL into user's balance account",
        "REQUIRES wallet signature - cannot use session key"
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "userBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeGame",
      "docs": [
        "Initialize the global game state (called once on deployment)",
        "Only the deployer becomes the authority"
      ],
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "lockRound",
      "docs": [
        "Lock the round with end price - permissionless after lock_time",
        "Anyone can call after the lock time has passed"
      ],
      "discriminator": [
        68,
        124,
        43,
        230,
        30,
        44,
        248,
        227
      ],
      "accounts": [
        {
          "name": "round",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "endPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBet",
      "docs": [
        "Place a bet on UP or DOWN",
        "Can use session key OR wallet signature"
      ],
      "discriminator": [
        222,
        62,
        67,
        220,
        63,
        166,
        126,
        33
      ],
      "accounts": [
        {
          "name": "gameState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "round",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "userBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user_balance.owner",
                "account": "userBalance"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              },
              {
                "kind": "account",
                "path": "user_balance.owner",
                "account": "userBalance"
              }
            ]
          }
        },
        {
          "name": "sessionToken",
          "docs": [
            "Session token for session key authentication (optional)",
            "If provided, allows session_signer to act on behalf of authority"
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user_balance.owner",
                "account": "userBalance"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": {
              "name": "betSide"
            }
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "revokeSession",
      "docs": [
        "Revoke a session token (wallet signature required)"
      ],
      "discriminator": [
        86,
        92,
        198,
        120,
        144,
        2,
        7,
        194
      ],
      "accounts": [
        {
          "name": "sessionToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "session_token.session_signer",
                "account": "sessionToken"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "setPaused",
      "docs": [
        "Pause/unpause the game (emergency only)"
      ],
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "settleRound",
      "docs": [
        "Settle the round - determines winner side",
        "Permissionless - anyone can call after round is locked"
      ],
      "discriminator": [
        40,
        101,
        18,
        1,
        31,
        129,
        52,
        77
      ],
      "accounts": [
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "round.round_id",
                "account": "bettingRound"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "startRound",
      "docs": [
        "Start a new betting round with the current price",
        "Authority only - backend reads price from oracle and submits"
      ],
      "discriminator": [
        144,
        144,
        43,
        7,
        193,
        42,
        217,
        215
      ],
      "accounts": [
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "game_state.current_round",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "game_state.current_round",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "startPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw SOL from user's balance account",
        "CRITICAL SECURITY: REQUIRES wallet signature - NEVER session key",
        "This prevents session key theft from draining funds"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "userBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bettingPool",
      "discriminator": [
        59,
        136,
        47,
        53,
        37,
        99,
        87,
        104
      ]
    },
    {
      "name": "bettingRound",
      "discriminator": [
        91,
        104,
        129,
        6,
        83,
        166,
        250,
        42
      ]
    },
    {
      "name": "gameState",
      "discriminator": [
        144,
        94,
        208,
        172,
        248,
        99,
        134,
        120
      ]
    },
    {
      "name": "playerPosition",
      "discriminator": [
        46,
        228,
        129,
        16,
        91,
        214,
        62,
        124
      ]
    },
    {
      "name": "sessionToken",
      "discriminator": [
        233,
        4,
        115,
        14,
        46,
        21,
        1,
        15
      ]
    },
    {
      "name": "userBalance",
      "discriminator": [
        187,
        237,
        208,
        146,
        86,
        132,
        29,
        191
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "gamePaused",
      "msg": "Game is currently paused"
    },
    {
      "code": 6002,
      "name": "invalidPrice",
      "msg": "Invalid price - must be greater than 0"
    },
    {
      "code": 6003,
      "name": "roundNotOpen",
      "msg": "Round is not open for betting"
    },
    {
      "code": 6004,
      "name": "roundLocked",
      "msg": "Round is already locked"
    },
    {
      "code": 6005,
      "name": "tooEarlyToLock",
      "msg": "Too early to lock the round"
    },
    {
      "code": 6006,
      "name": "roundNotLocked",
      "msg": "Round is not locked yet"
    },
    {
      "code": 6007,
      "name": "tooEarlyToSettle",
      "msg": "Too early to settle the round"
    },
    {
      "code": 6008,
      "name": "roundNotSettled",
      "msg": "Round is not settled yet"
    },
    {
      "code": 6009,
      "name": "amountTooSmall",
      "msg": "Bet amount is below minimum (0.01 SOL)"
    },
    {
      "code": 6010,
      "name": "amountTooLarge",
      "msg": "Bet amount exceeds maximum (100 SOL)"
    },
    {
      "code": 6011,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6012,
      "name": "notBalanceOwner",
      "msg": "Not the owner of this balance account"
    },
    {
      "code": 6013,
      "name": "notPositionOwner",
      "msg": "Not the owner of this position"
    },
    {
      "code": 6014,
      "name": "alreadyClaimed",
      "msg": "Position already claimed"
    },
    {
      "code": 6015,
      "name": "mathOverflow",
      "msg": "Math overflow occurred"
    },
    {
      "code": 6016,
      "name": "invalidSessionDuration",
      "msg": "Invalid session duration"
    },
    {
      "code": 6017,
      "name": "sessionTooLong",
      "msg": "Session duration exceeds maximum (7 days)"
    },
    {
      "code": 6018,
      "name": "sessionExpired",
      "msg": "Session has expired"
    },
    {
      "code": 6019,
      "name": "sessionAuthorityMismatch",
      "msg": "Session authority does not match"
    },
    {
      "code": 6020,
      "name": "invalidSessionSigner",
      "msg": "Invalid session signer"
    },
    {
      "code": 6021,
      "name": "notSessionOwner",
      "msg": "Not the owner of this session"
    }
  ],
  "types": [
    {
      "name": "betSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "up"
          },
          {
            "name": "down"
          }
        ]
      }
    },
    {
      "name": "bettingPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roundId",
            "type": "u64"
          },
          {
            "name": "upPool",
            "type": "u64"
          },
          {
            "name": "downPool",
            "type": "u64"
          },
          {
            "name": "totalPool",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bettingRound",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roundId",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "lockTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "startPrice",
            "type": "u64"
          },
          {
            "name": "endPrice",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "roundStatus"
              }
            }
          },
          {
            "name": "winner",
            "type": {
              "defined": {
                "name": "winnerSide"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "gameState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "currentRound",
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "totalFeesCollected",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "playerPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "roundId",
            "type": "u64"
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "betSide"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "roundStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "locked"
          },
          {
            "name": "settled"
          }
        ]
      }
    },
    {
      "name": "sessionToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The wallet that created this session"
            ],
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "docs": [
              "The temporary signer authorized by this session"
            ],
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "docs": [
              "Unix timestamp when this session expires"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userBalance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalWithdrawn",
            "type": "u64"
          },
          {
            "name": "totalWinnings",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "winnerSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "up"
          },
          {
            "name": "down"
          },
          {
            "name": "draw"
          }
        ]
      }
    }
  ]
};

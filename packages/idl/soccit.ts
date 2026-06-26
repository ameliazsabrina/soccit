/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/soccit.json`.
 */
export type Soccit = {
  "address": "TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v",
  "metadata": {
    "name": "soccit",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Soccit — on-chain escrow & settlement for live soccer-substitution predictions"
  },
  "instructions": [
    {
      "name": "createMatch",
      "docs": [
        "Admin: open a match, init the Match PDA + vault ATA, pin entry fee + resolver."
      ],
      "discriminator": [
        107,
        2,
        184,
        145,
        70,
        142,
        17,
        165
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "usdtMint"
        },
        {
          "name": "vaultAuthority",
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
                "path": "matchAccount"
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
                "kind": "account",
                "path": "vaultAuthority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdtMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u64"
        },
        {
          "name": "team1Id",
          "type": "u32"
        },
        {
          "name": "team2Id",
          "type": "u32"
        },
        {
          "name": "entryFee",
          "type": "u64"
        },
        {
          "name": "resolver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "placePrediction",
      "docs": [
        "User: pay the flat fee into the vault and record a prediction. Placing is locking."
      ],
      "discriminator": [
        79,
        46,
        195,
        197,
        50,
        91,
        88,
        229
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "match_account.match_id",
                "account": "match"
              }
            ]
          }
        },
        {
          "name": "prediction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "userUsdtAta",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "kind",
          "type": "u8"
        },
        {
          "name": "outId",
          "type": "u32"
        },
        {
          "name": "inId",
          "type": "u32"
        },
        {
          "name": "lockMinute",
          "type": "u16"
        },
        {
          "name": "nonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resolve",
      "docs": [
        "Resolver: write the backend-finalized terminal phase + top-3 winners."
      ],
      "discriminator": [
        246,
        150,
        236,
        206,
        108,
        63,
        58,
        10
      ],
      "accounts": [
        {
          "name": "resolver",
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "match_account.match_id",
                "account": "match"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "terminalPhase",
          "type": "u8"
        },
        {
          "name": "winner1",
          "type": "pubkey"
        },
        {
          "name": "winner2",
          "type": "pubkey"
        },
        {
          "name": "winner3",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "settleAndPayout",
      "docs": [
        "Resolver: pay 35/25/20 to winners + remainder to platform; drain the vault."
      ],
      "discriminator": [
        247,
        163,
        22,
        141,
        33,
        169,
        225,
        56
      ],
      "accounts": [
        {
          "name": "resolver",
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "match_account.match_id",
                "account": "match"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
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
                "path": "matchAccount"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "winner1Ata",
          "writable": true,
          "optional": true
        },
        {
          "name": "winner2Ata",
          "writable": true,
          "optional": true
        },
        {
          "name": "winner3Ata",
          "writable": true,
          "optional": true
        },
        {
          "name": "platformAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "match",
      "discriminator": [
        236,
        63,
        169,
        38,
        15,
        56,
        196,
        162
      ]
    },
    {
      "name": "prediction",
      "discriminator": [
        98,
        127,
        141,
        187,
        218,
        33,
        8,
        14
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorizedResolver",
      "msg": "Only the match resolver may call this instruction"
    },
    {
      "code": 6001,
      "name": "matchNotOpen",
      "msg": "Match is not in the OPEN state"
    },
    {
      "code": 6002,
      "name": "matchNotResolved",
      "msg": "Match has not been resolved yet"
    },
    {
      "code": 6003,
      "name": "alreadySettled",
      "msg": "Match has already been settled"
    },
    {
      "code": 6004,
      "name": "invalidKind",
      "msg": "Invalid prediction kind (expected 0=OUT, 1=IN, 2=COMBO)"
    },
    {
      "code": 6005,
      "name": "invalidSide",
      "msg": "Invalid side (expected 1 or 2)"
    },
    {
      "code": 6006,
      "name": "incompleteCombo",
      "msg": "COMBO prediction requires both an OUT and an IN player id"
    },
    {
      "code": 6007,
      "name": "vaultMismatch",
      "msg": "Provided vault account does not match the match's vault"
    },
    {
      "code": 6008,
      "name": "mintMismatch",
      "msg": "Provided USDT mint does not match the match's mint"
    },
    {
      "code": 6009,
      "name": "winnerAccountMismatch",
      "msg": "A provided winner token account does not belong to the recorded winner"
    },
    {
      "code": 6010,
      "name": "vaultUnderfunded",
      "msg": "Vault token balance does not cover the recorded pool total"
    },
    {
      "code": 6011,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "match",
      "docs": [
        "One per fixture. Source of truth for escrow parameters and settlement."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u64"
          },
          {
            "name": "team1Id",
            "type": "u32"
          },
          {
            "name": "team2Id",
            "type": "u32"
          },
          {
            "name": "entryFee",
            "docs": [
              "Flat entry fee per prediction, in USDT base units (6 decimals)."
            ],
            "type": "u64"
          },
          {
            "name": "poolTotal",
            "docs": [
              "Running sum of every entry fee paid into the vault."
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "0=OPEN, 1=RESOLVED, 2=SETTLED."
            ],
            "type": "u8"
          },
          {
            "name": "terminalPhase",
            "docs": [
              "Terminal phase the resolver reported (F / FET / FPE encoded by backend)."
            ],
            "type": "u8"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "resolver",
            "docs": [
              "Authorized key allowed to call `resolve` and `settle_and_payout`."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdtMint",
            "docs": [
              "USDT mint backing this match's escrow."
            ],
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "Vault token account (ATA owned by the vault-authority PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "winner1",
            "docs": [
              "Backend-finalized winners (Pubkey::default() == no winner for that place)."
            ],
            "type": "pubkey"
          },
          {
            "name": "winner2",
            "type": "pubkey"
          },
          {
            "name": "winner3",
            "type": "pubkey"
          },
          {
            "name": "vaultAuthorityBump",
            "docs": [
              "PDA bump for the vault authority."
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump for this match account."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "prediction",
      "docs": [
        "One per pick. Placing IS locking — `lock_minute` is stamped at placement and",
        "validity is decided off-chain retroactively. `points` is informational only",
        "(the contract settles from `winner1/2/3`, not from on-chain scoring)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "matchKey",
            "type": "pubkey"
          },
          {
            "name": "side",
            "docs": [
              "Team the user committed to (1 or 2)."
            ],
            "type": "u8"
          },
          {
            "name": "kind",
            "docs": [
              "0=OUT, 1=IN, 2=COMBO."
            ],
            "type": "u8"
          },
          {
            "name": "outPlayerId",
            "type": "u32"
          },
          {
            "name": "inPlayerId",
            "type": "u32"
          },
          {
            "name": "lockMinute",
            "docs": [
              "Match minute at placement, supplied by the resolver-trusted oracle path."
            ],
            "type": "u16"
          },
          {
            "name": "feePaid",
            "type": "u64"
          },
          {
            "name": "nonce",
            "docs": [
              "Caller-supplied disambiguator so a wallet can place unlimited picks."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "matchSeed",
      "type": "bytes",
      "value": "[109, 97, 116, 99, 104]"
    },
    {
      "name": "predSeed",
      "type": "bytes",
      "value": "[112, 114, 101, 100]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};

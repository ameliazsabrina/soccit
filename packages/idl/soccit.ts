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
          "name": "usdcMint"
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
                "path": "usdcMint"
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
          "name": "entry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "matchAccount"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "userUsdcAta",
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
          "name": "slotIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "resolve",
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
      "name": "entry",
      "discriminator": [
        63,
        18,
        152,
        113,
        215,
        246,
        221,
        250
      ]
    },
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
      "msg": "Invalid prediction kind"
    },
    {
      "code": 6005,
      "name": "invalidSide",
      "msg": "Invalid side"
    },
    {
      "code": 6006,
      "name": "incompleteCombo",
      "msg": "COMBO prediction requires both an OUT and an IN player id"
    },
    {
      "code": 6007,
      "name": "slotsFull",
      "msg": "Wallet has already used all of its slots for this match"
    },
    {
      "code": 6008,
      "name": "sideLocked",
      "msg": "All of a wallet's picks must be for the side chosen on its first pick"
    },
    {
      "code": 6009,
      "name": "duplicatePlayer",
      "msg": "Player id has already been used in another slot"
    },
    {
      "code": 6010,
      "name": "slotIndexMismatch",
      "msg": "Provided slot index does not match the next free slot"
    },
    {
      "code": 6011,
      "name": "selfSubstitution",
      "msg": "COMBO prediction cannot use the same player as both OUT and IN"
    },
    {
      "code": 6012,
      "name": "vaultMismatch",
      "msg": "Provided vault account does not match the match vault"
    },
    {
      "code": 6013,
      "name": "mintMismatch",
      "msg": "Provided token mint does not match the match mint"
    },
    {
      "code": 6014,
      "name": "winnerAccountMismatch",
      "msg": "Winner token account does not belong to the recorded winner"
    },
    {
      "code": 6015,
      "name": "vaultUnderfunded",
      "msg": "Vault token balance does not cover the recorded pool total"
    },
    {
      "code": 6016,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "entry",
      "docs": [
        "One per (match, wallet). Tracks the wallet's slot usage, locked side,",
        "and the players already consumed across its slots."
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
            "type": "u8"
          },
          {
            "name": "slotsUsed",
            "type": "u8"
          },
          {
            "name": "players",
            "type": {
              "array": [
                "u32",
                10
              ]
            }
          },
          {
            "name": "playerCount",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "match",
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
            "type": "u64"
          },
          {
            "name": "poolTotal",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "terminalPhase",
            "type": "u8"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "resolver",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
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
          },
          {
            "name": "vaultAuthorityBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "participantCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "prediction",
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
            "type": "u8"
          },
          {
            "name": "kind",
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
            "type": "u16"
          },
          {
            "name": "feePaid",
            "type": "u64"
          },
          {
            "name": "slotIndex",
            "type": "u8"
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
      "name": "entrySeed",
      "type": "bytes",
      "value": "[101, 110, 116, 114, 121]"
    },
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

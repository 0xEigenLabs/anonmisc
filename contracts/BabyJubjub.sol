// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Baby jubjub curve using extended twisted edwards coordinate points with compress and decompress functions
 * Based on: https://github.com/yondonfu/sol-baby-jubjub and https://eprint.iacr.org/2008/013.pdf
 */
contract BabyJubjub {
    // Curve parameters
    // E: A^2 + y^2 = 1 + Dx^2y^2 (mod Q)
    uint256 public constant A = 168700;
    uint256 public constant D = 168696;
    uint256 public constant Q = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant H_ = 10944121435919637611123202872628637544274182200208017171849102093287904247808; // H=(Q+1)/2
    uint256 public constant R_ = 2736030358979909402780800718157159386076813972158567259200215660948447373041;

    uint256 public pp = Q;
    uint256 public constant nn = R_ * 8;
    // copy from https://github.com/iden3/circomlibjs/blob/v0.1.2/src/babyjub.js#L14
    uint256 public gx = 995203441582195749578291179787384436505546430278305826713579947235728471134;
    uint256 public gy = 5472060717959818805561601436314318772137091100104008585924551046643952123905;

    /**
     * @dev default Generator in affine form
     */
    function afG() internal pure returns (uint256[2] memory G) {
        return [
            16540640123574156134436876038791482806971768689494387082833631921987005038935,
            20819045374670962167435360035096875258406992893633759881276124905556507972311
        ];
    }

    /**
     * @dev default Generator in extended form
     */
    function exG() internal pure returns (uint256[4] memory G) {
        return [
            16540640123574156134436876038791482806971768689494387082833631921987005038935,
            20819045374670962167435360035096875258406992893633759881276124905556507972311,
            14703762428987035122442627039999163771877448240605145614492668893944702266450,
            uint256(1)
        ];
    }

    /**
     * @dev default Generator in compressed form
     */
    function cmG() internal pure returns (uint256 G) {
        return 0xAE07297F8D3C3D7818DBDDFD24C35583F9A9D4ED0CB0C1D1348DD8F7F99152D7;
    }

    // TODO FIXME comment and move to the interface
    function eAdd(uint256 _x1, uint256 _y1, uint256 _x2, uint256 _y2) public view returns (uint256 _x, uint256 _y) {
        uint256[2] memory res = afAdd([_x1, _y1], [_x2, _y2]);
        _x = res[0];
        _y = res[1];
    }

    function eSub(uint256 _x1, uint256 _y1, uint256 _x2, uint256 _y2) public view returns (uint256 _x, uint256 _y) {
        uint256[2] memory res = afSub([_x1, _y1], [_x2, _y2]);
        _x = res[0];
        _y = res[1];
    }

    /**
     * @dev Add 2 points on baby jubjub curve
     * Formulae for adding 2 points on a twisted Edwards curve:
     * x3 = (x1y2 + y1x2) / (1 + dx1x2y1y2)
     * y3 = (y1y2 - ax1x2) / (1 - dx1x2y1y2)
     * @param _p1 first point in affine form
     * @param _p2 second point in affine form
     * @return p3 elliptic curve addition p3 = _p1 + _p2
     */
    function afAdd(uint256[2] memory _p1, uint256[2] memory _p2) internal view returns (uint256[2] memory p3) {
        uint256 x1x2 = mulmod(_p1[0], _p2[0], Q);
        uint256 y1y2 = mulmod(_p1[1], _p2[1], Q);
        uint256 dx1x2y1y2 = mulmod(D, mulmod(x1x2, y1y2, Q), Q);
        uint256 x3Num = addmod(mulmod(_p1[0], _p2[1], Q), mulmod(_p1[1], _p2[0], Q), Q);
        uint256 y3Num = submod(y1y2, mulmod(A, x1x2, Q));

        return [mulmod(x3Num, invmod(addmod(1, dx1x2y1y2, Q)), Q), mulmod(y3Num, invmod(submod(1, dx1x2y1y2)), Q)];
    }

    /**
     * @dev Double a point on baby jubjub curve
     * Doubling can be performed with the same formula as addition
     * @param _p point to double in affine form
     * @return p point _p doubled p = 2 * _p (elliptic cruve multiplication)
     */
    function afDouble(uint256[2] memory _p) internal view returns (uint256[2] memory p) {
        return afAdd(_p, _p);
    }

    function eMul(uint256 _d, uint256 _x, uint256 _y) public view returns (uint256 _u, uint256 _v) {
        uint256[2] memory res = afMul([_x, _y], _d);
        _u = res[0];
        _v = res[1];
    }

    /**
     * @dev Multiply a point on baby jubjub curve by a scalar
     * Use the double and add algorithm
     * @param _p point be multiplied by a scalare in affine form
     * @param _d scalar value
     * @return p affine form of point p = d * p (elliptic curve multiplication)
     */
    function afMul(uint256[2] memory _p, uint256 _d) internal view returns (uint256[2] memory p) {
        uint256 remaining = _d % nn;

        uint256[2] memory ex = _p;
        p = [uint256(0), uint256(1)];

        while (remaining != 0) {
            if ((remaining & 1) != 0) {
                // Binary digit is 1 so add
                p = afAdd(p, ex);
            }

            ex = afDouble(ex);

            remaining = remaining / 2;
        }
    }

    /**
     * @dev Subtracts an affine point from another affine point on babyjubjub
     * @param _p1 the point which will be subtracted from
     * @param _p2 affine form of the point to subtract
     * @return p3 elliptic curve subtraction p3 = _p1 - _p2
     */
    function afSub(uint256[2] memory _p1, uint256[2] memory _p2) public view returns (uint256[2] memory p3) {
        return afAdd(_p1, afNeg(_p2));
    }

    /**
     * @dev Negatives an affine point on babyjubjub
     * @param _p point to negativize
     * @return p = -(_p)
     */
    function afNeg(uint256[2] memory _p) internal pure returns (uint256[2] memory p) {
        return [Q-_p[0]%Q, _p[1]];
    }

    /**
     * @dev Check if a given point is on the curve
     * (168700x^2 + y^2) - (1 + 168696x^2y^2) == 0
     * @param _p affine form of the point
     * @return true if it is on curve otherwise false
     */
    function afOnCurve(uint256[2] memory _p) public pure returns (bool) {
        uint256 xSq = mulmod(_p[0], _p[0], Q);
        uint256 ySq = mulmod(_p[1], _p[1], Q);
        uint256 lhs = addmod(mulmod(A, xSq, Q), ySq, Q);
        uint256 rhs = addmod(1, mulmod(mulmod(D, xSq, Q), ySq, Q), Q);
        return submod(lhs, rhs) == 0;
    }

    /**
     * @dev Convert an affine from of elliptic curve point on BabyJubJub curve into its compressed form
     * @param _p normal decompressed form of the point
     * @return c compressed form of the point in a single uint256
     */
    function afCompress(uint256[2] memory _p) internal pure returns (uint256 c) {
        // Compare to half the Q to determine the sign
        if (_p[0] > H_) {
            c = _p[1] | 0x8000000000000000000000000000000000000000000000000000000000000000;
        } else {
            c = _p[1];
        }
    }

    /**
     * @dev Convert a compressed BabyJubJub curve point into its affine decompressed form
     * @param _c compressed form of the point
     * @return p the point in its decompresed form
     */
    function afDecompress(uint256 _c) internal view returns (uint256[2] memory p) {
        bool sign1 = (_c & 0x8000000000000000000000000000000000000000000000000000000000000000) != 0;
        uint256 y = _c & 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        uint256 y2 = mulmod(y, y, Q);
        uint256 x2 = mulmod(submod(1, y2), invmod(submod(A, mulmod(D, y2, Q))), Q); // x = (1 - y^2) / (A - D * y^2)
        uint256 x = sqrtmod(x2);
        bool sign2 = (x > H_);
        if ((sign1 && !sign2) || (!sign1 && sign2)) {
            x = Q - x;
        }
        p = [x, y];
    }

    /**
     * @dev Convert extended point to affine point
     * @param _p extended form of the point represented by uint256[4]
     * @return p which is the affine form of the point represented by uint256[2]
     */
    function toAffine(uint256[4] memory _p) internal view returns (uint256[2] memory p) {
        uint256 invZ = invmod(_p[3]);
        p[0] = mulmod(_p[0], invZ, Q);
        p[1] = mulmod(_p[1], invZ, Q);
    }

    /**
     * @dev Convert affine point to extended point
     * @param _p affine form of the point represented by uint256[2]
     * @return etec p which is the extended form of the point represented by uint256[4]
     */
    function toExtended(uint256[2] memory _p) internal pure returns (uint256[4] memory etec) {
        etec[0] = _p[0];
        etec[1] = _p[1];
        etec[2] = mulmod(_p[0], _p[1], Q);
        etec[3] = 1;
    }

    /**
     * @dev Add 2 extended from points on baby jubjub curve
     * x3 = (x1y2 + y1x2) * (z1z2 - dt1t2)
     * y3 = (y1y2 - ax1x2) * (z1z2 + dt1t2)
     * t3 = (y1y2 - ax1x2) * (x1y2 + y1x2)
     * z3 = (z1z2 - dt1t2) * (z1z2 + dt1t2)
     * @param _p1 first point in extended from
     * @param _p2 second point in extended form
     * @return p3 extended from of the addition of _p1 and _p2 (p3 = _p1 + _p2)
     */
    function exAdd(
        uint256[4] memory _p1,
        uint256[4] memory _p2
    )
        internal
        pure
        returns (uint256[4] memory p3)
    {
        assembly {
            let localQ := 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001
            let localA := 0x292FC
            let localD := 0x292F8

            // A <- x1 * x2
            let a := mulmod(mload(_p1), mload(_p2), localQ)
            // B <- y1 * y2
            let b := mulmod(mload(add(_p1, 0x20)), mload(add(_p2, 0x20)), localQ)
            // C <- d * t1 * t2
            let c := mulmod(mulmod(localD, mload(add(_p1, 0x40)), localQ), mload(add(_p2, 0x40)), localQ)
            // D <- z1 * z2
            let d := mulmod(mload(add(_p1, 0x60)), mload(add(_p2, 0x60)), localQ)
            // E <- (x1 + y1) * (x2 + y2) - A - B
            let e := mulmod(addmod(mload(_p1), mload(add(_p1, 0x20)), localQ), addmod(mload(_p2), mload(add(_p2, 0x20)), localQ), localQ)
            if lt(e, add(a, 1)) {
                e := add(e, localQ)
            }
            e := mod(sub(e, a), localQ)
            if lt(e, add(b, 1)) {
                e := add(e, localQ)
            }
            e := mod(sub(e, b), localQ)
            // F <- D - C
            let f := d
            if lt(f, add(c, 1)) {
                f := add(f, localQ)
            }
            f := mod(sub(f, c), localQ)
            // G <- D + C
            let g := addmod(d, c, localQ)
            // H <- B - a * A
            let aA := mulmod(localA, a, localQ)
            let h := b
            if lt(h, add(aA, 1)) {
                h := add(h, localQ)
            }
            h := mod(sub(h, aA), localQ)

            // x3 <- E * F
            mstore(p3, mulmod(e, f, localQ))
            // y3 <- G * H
            mstore(add(p3, 0x20), mulmod(g, h, localQ))
            // t3 <- E * H
            mstore(add(p3, 0x40), mulmod(e, h, localQ))
            // z3 <- F * G
            mstore(add(p3, 0x60), mulmod(f, g, localQ))
        }
    }

    /**
     * @dev Double a etec point using dedicated double algorithm
     * @return x point _p doubled p = 2 * _p (elliptic cruve multiplication) extended from
     * @return y point _p doubled p = 2 * _p (elliptic cruve multiplication) extended from
     */
    function exDouble(
        uint256 _x,
        uint256 _y,
        // uint256 _t,
        uint256 _z
    )
        internal
        pure
        returns (uint256 x, uint256 y, uint256 t, uint256 z)
    {
        assembly {
            let localQ := 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001
            let localA := 0x292FC

            // A <- x1 * x1
            let a := mulmod(_x, _x, localQ)
            // B <- y1 * y1
            let b := mulmod(_y, _y, localQ)
            // C <- 2 * z1 * z1
            let c := mulmod(mulmod(2, _z, localQ), _z, localQ)
            // D <- a * A
            let d := mulmod(localA, a, localQ)
            // E <- (x1 + y1)^2 - A - B
            let e := addmod(_x, _y, localQ)
            e := mulmod(e, e, localQ)
            if lt(e, add(a, 1)) {
                e := add(e, localQ)
            }
            e := mod(sub(e, a), localQ)
            if lt(e, add(b, 1)) {
                e := add(e, localQ)
            }
            e := mod(sub(e, b), localQ)
            // G <- D + B
            let g := addmod(d, b, localQ)
            // F <- G - C
            let f := g
            if lt(f, add(c, 1)) {
                f := add(f, localQ)
            }
            f := mod(sub(f, c), localQ)
            // H <- D - B
            let h := d
            if lt(h, add(b, 1)) {
                h := add(h, localQ)
            }
            h := mod(sub(h, b), localQ)

            // x3 <- E * F
            x := mulmod(e, f, localQ)
            // y3 <- G * H
            y := mulmod(g, h, localQ)
            // t3 <- E * H
            t := mulmod(e, h, localQ)
            // z3 <- F * G
            z := mulmod(f, g, localQ)
        }
    }


    /**
     * @dev Subtracts an extended point from another extended point on babyjubjub
     * @param _p1 the point which will be subtracted from
     * @param _p2 extended form of the point to subtract
     * @return p3 elliptic curve subtraction p3 = _p1 - _p2
     */
    function exSub(uint256[4] memory _p1, uint256[4] memory _p2) internal pure returns (uint256[4] memory p3) {
        return exAdd(_p1, exNeg(_p2));
    }

    /**
     * @dev Negatives an extended point on babyjubjub
     * @param _p point to negativize
     * @return p = -(_p)
     */
    function exNeg(uint256[4] memory _p) internal pure returns (uint256[4] memory p) {
        return [Q-_p[0], _p[1], Q-_p[2], _p[3]];
    }

    /**
     * @dev Multiply a etec point on baby jubjub curve by a scalar
     * Use the double and add algorithm
     * @param _p point be multiplied by a scalare in extended form
     * @param _d scalar value
     * @return p extended form of point p = d * p (elliptic curve multiplication)
     */
    function exMul(uint256[4] memory _p, uint256 _d) internal pure returns (uint256[4] memory p) {
        uint256 remaining = _d % nn;

        uint256[4] memory ap = [uint256(0), uint256(1), uint256(0), uint256(1)];
        uint256 x = _p[0];
        uint256 y = _p[1];
        uint256 t = _p[2];
        uint256 z = _p[3];

        while (remaining != 0) {
            if ((remaining & 1) != 0) {
                // Binary digit is 1 so add
                ap = exAdd(ap, [x, y, t, z]);
            }

            (x, y, t, z) = exDouble(x, y, z);

            remaining = remaining / 2;
        }

        p = ap;
    }

    /**
     * @dev Check if a given extended point is on the curve
     * @param _p the extended form of the point
     * @return true if it is on curve false if it is not on curve
     */
    function exOnCurve(uint256[4] memory _p) internal view returns (bool) {
        uint256 invZ = invmod(_p[3]);
        uint256 x = mulmod(_p[0], invZ, Q);
        uint256 y = mulmod(_p[1], invZ, Q);
        uint256 xSq = mulmod(x, x, Q);
        uint256 ySq = mulmod(y, y, Q);
        uint256 lhs = addmod(mulmod(A, xSq, Q), ySq, Q);
        uint256 rhs = addmod(1, mulmod(mulmod(D, xSq, Q), ySq, Q), Q);
        return submod(lhs, rhs) == 0;
    }

    /**
     * @dev Convert an extended from of elliptic curve point on BabyJubJub curve into its compressed form
     * @param _p normal decompressed form of the point
     * @return c compressed form of the point in a single uint256
     */
    function exCompress(uint256[4] memory _p) internal view returns (uint256 c) {
        uint256 invZ = invmod(_p[3]);
        // Compare to half the Q to determine the sign
        if (mulmod(_p[0], invZ, Q) > H_) {
            c = mulmod(_p[1], invZ, Q) | 0x8000000000000000000000000000000000000000000000000000000000000000;
        } else {
            c = mulmod(_p[1], invZ, Q);
        }
    }

    /**
     * @dev Convert a compressed BabyJubJub curve point into its extended decompressed form
     * @param _c compressed form of the point
     * @return p (x,y) the point in its decompresed form
     */
    function exDecompress(uint256 _c) internal view returns (uint256[4] memory p) {
        bool sign1 = (_c & 0x8000000000000000000000000000000000000000000000000000000000000000) != 0;
        uint256 y = _c & 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        uint256 y2 = mulmod(y, y, Q);
        uint256 x2 = mulmod(submod(1, y2), invmod(submod(A, mulmod(D, y2, Q))), Q); // x = (1 - y^2) / (A - D * y^2)
        uint256 x = sqrtmod(x2);
        bool sign2 = (x > H_);
        if ((sign1 && !sign2) || (!sign1 && sign2)) {
            x = Q - x;
        }
        p = [x, y, mulmod(x, y, Q), 1];
    }

    /**
     * @dev Add 2 compressed points on baby jubjub curve
     * @param _p1 first point in compressed form
     * @param _p2 second point in compressed
     * @return p3 elliptic curve addition p3 = _p1 + _p2
     */
    function cmAdd(uint256 _p1, uint256 _p2) internal view returns (uint256 p3) {
        return exCompress(exAdd(exDecompress(_p1), exDecompress(_p2)));
    }

    /**
     * @dev Add 2 compressed points on baby jubjub curve
     * @param _p1 first point in compressed form
     * @param _p2 second point in compressed
     * @return p3 elliptic curve addition p3 = _p1 + _p2
     */
    function cmSub(uint256 _p1, uint256 _p2) internal view returns (uint256 p3) {
        return exCompress(exSub(exDecompress(_p1), exDecompress(_p2)));
    }

    /**
     * @dev Multiply a compressed point on baby jubjub curve by a scalar
     * Uses the exDouble and exAdd algorithms
     * @param _p point be multiplied by a scalare in compressed form
     * @param _d the scalar value
     * @return p3 compressed form of point p = d * p (elliptic curve multiplication)
     */
    function cmMul(uint256 _p, uint256 _d) internal view returns (uint256 p3) {
        return exCompress(exMul(exDecompress(_p), _d));
    }

    /**
     * @dev Modular subtract (mod n).
     * @param a The first number
     * @param b The number to be subtracted
     * @return r such that r = a-b (mod n)
     */
    function submod(uint256 a, uint256 b) internal pure returns (uint256) {
        return addmod(a, Q - b, Q);
    }

    /**
     * @dev Compute modular inverse of a number
     * @param _a the value to be inverted in mod Q
     */
    function invmod(uint256 _a) internal view returns (uint256) {
        // We can use Euler's theorem instead of the extended Euclidean algorithm
        // Since m = Q and Q is prime we have: a^-1 = a^(m - 2) (mod m)
        return expmod(_a, 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593efffffff);
    }

    /**
     * @dev Exponentiation modulo Q
     * @param _b the base of the exponentiation
     * @param _e the exponent
     * @return o the output value mod Q
     */
    function expmod(uint256 _b, uint256 _e) internal view returns (uint256 o) {
        assembly {
            let localQ := 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001
            let memPtr := mload(0x40)
            mstore(memPtr, 0x20) // Length of base _b
            mstore(add(memPtr, 0x20), 0x20) // Length of exponent _e
            mstore(add(memPtr, 0x40), 0x20) // Length of modulus Q
            mstore(add(memPtr, 0x60), _b) // Base _b
            mstore(add(memPtr, 0x80), _e) // Exponent _e
            mstore(add(memPtr, 0xa0), localQ) // Modulus Q

            // The bigModExp precompile is at 0x05
            let success := staticcall(gas(), 0x05, memPtr, 0xc0, memPtr, 0x20)
            switch success
            case 0 {
                revert(0x0, 0x0)
            } default {
                o := mload(memPtr)
            }
        }
    }

    /**
     * @dev Calculates square root of x^2 in BabyJubJub modulous using Tonelli-Shanks
     * @param _x2 the number to calculate its square root
     * @return x such that x^2 = x (mod Q)
     */
    function sqrtmod(uint256 _x2) internal view returns (uint256 x) {
        // S is Q-1 without trailing zeros
        // N is the non-square number in ZZ_Q
        x = expmod(_x2, 0x183227397098D014DC2822DB40C0AC2E9419F4243CDCB848A1F0FACA0); // x = _x2 ^ (S+1)/2
        uint256 b = expmod(_x2, 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F); // b = _x2 ^ S
        uint256 g = 0x2A3C09F0A58A7E8500E0A7EB8EF62ABC402D111E41112ED49BD61B6E725B19F0; // g = N ^ S
        uint256 t;
        uint16 r = 28; // number of trailing zeros in Q-1
        uint16 m;
        while (true) {
            m = 0;
            t = b;
            while (t != 1) {
                t = mulmod(t, t, Q);
                m++;
            }

            if (m == 0) {
                return x;
            }

            t = g;
            for (uint16 i; i < (r-m-1); i++) {
                t = mulmod(t, t, Q);
            } // t = g^(2^(r-m-1)) mod Q

            g = mulmod(t, t, Q); // g = g^(2^(r-m)) mod Q
            x = mulmod(t, x, Q); // x = x * t mod Q
            b = mulmod(b, g, Q); // b = b * g mod Q
            r = m;
        }
    }
}

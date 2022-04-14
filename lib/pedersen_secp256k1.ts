import * as crypto from 'crypto';

const secp256k1 = require('@noble/secp256k1')
const CURVE = secp256k1.CURVE
const Point = secp256k1.Point

var G = new Point(CURVE.Gx, CURVE.Gy)

function generateRandom() {
    let random;
    do {
        random = BigInt("0x" + crypto.randomBytes(32).toString('hex'));
    } while (random >= CURVE.n); // make sure it's in the safe range
    return random;
}

function generateH() {
    return G.multiply(generateRandom());
}

// commit to a Value X
//   r - private Key used as blinding factor
//   H - shared private? point on the curve
function commitTo(H, r, x) {
    return G.multiply(r % CURVE.n).add(H.multiply(x));
}

// sum two commitments using homomorphic encryption
//
function add(Cx, Cy) {
    return Cx.add(Cy);
}

// subtract two commitments using homomorphic encryption
//
function sub(Cx, Cy) {
    return Cx.add(Cy.negate());
}

// add two known values with blinding factors
//   and compute the committed value
//   add rX + rY (blinding factor private keys)
//   add vX + vY (hidden values)
function addCommitment(H, rX, rY, vX, vY) {
    // umod to wrap around if negative
    var rZ = (rX + rY) % CURVE.n;
    return G.multiply(rZ).add(H.multiply((vX + vY) % CURVE.n));
}

// subtract two known values with blinding factors
//   and compute the committed value
//   add rX - rY (blinding factor private keys)
//   add vX - vY (hidden values)
function subCommitment(H, rX, rY, vX, vY) {
    var rZ;
    if (rX > rY) {
        rZ = (rX - rY) % CURVE.n;
    } else {
        rZ = (rX - rY) + CURVE.n;
    }
    
    return G.multiply(rZ).add(H.multiply((vX - vY) % CURVE.n));
}


// Verifies that the commitment given is the same
//  H - secondary point
//  C - commitment
//  r - blinding factor private key used to create the commitment
//  v - original value committed to
function verify(H, C, r, v) {
    return G.multiply(r % CURVE.n).add(H.multiply(v)).equals(C);
}


module.exports = {
    commitTo,
    add,
    sub,
    addCommitment,
    subCommitment,
    verify,
    generateRandom,
    generateH
}
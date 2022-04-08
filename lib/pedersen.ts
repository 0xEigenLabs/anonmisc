import * as crypto from 'crypto'
import { buildBabyjub } from 'circomlibjs';
let babyjub
let G

async function generateRandom() {
    babyjub = await buildBabyjub(); 
    let random;
    do {
        random = BigInt("0x" + crypto.randomBytes(32).toString('hex'));
    } while (random >= babyjub.order); // make sure it's in the safe range
    return random;
}

async function generateH() {
    babyjub = await buildBabyjub();
    G = babyjub.Generator
    return babyjub.mulPointEscalar(G, await generateRandom())
}

// var H = generateH()

// commit to a Value X
//   r - private Key used as blinding factor
//   H - shared private? point on the curve
async function commitTo(H, r, x) {
    babyjub = await buildBabyjub();
    G = babyjub.Generator
    return babyjub.addPoint(babyjub.mulPointEscalar(G, r % babyjub.order), babyjub.mulPointEscalar(H, x))
}

// sum two commitments using homomorphic encryption
async function add(Cx, Cy) {
    babyjub = await buildBabyjub(); 
    return babyjub.addPoint(Cx, Cy);
}

// subtract two commitments using homomorphic encryption
async function sub(Cx, Cy) {
    babyjub = await buildBabyjub(); 
    let Cy_neg = [
        babyjub.F.neg(Cy[0]),
        Cy[1]
    ]
    return babyjub.addPoint(Cx, Cy_neg);
}

// add two known values with blinding factors
//   and compute the committed value
//   add rX + rY (blinding factor private keys)
//   add vX + vY (hidden values)
async function addCommitment(H, rX, rY, vX, vY) {
    // umod to wrap around if negative
    babyjub = await buildBabyjub(); 
    G = babyjub.Generator
    var rZ = (rX + rY) % babyjub.order;
    return babyjub.addPoint(babyjub.mulPointEscalar(G, rZ), babyjub.mulPointEscalar(H, (vX + vY) % babyjub.order));
}

// subtract two known values with blinding factors
//   and compute the committed value
//   add rX - rY (blinding factor private keys)
//   add vX - vY (hidden values)
async function subCommitment(H, rX, rY, vX, vY) {
    babyjub = await buildBabyjub(); 
    G = babyjub.Generator
    var rZ;
    if (rX > rY) {
        rZ = (rX - rY) % babyjub.order;
    } else {
        rZ = (rX - rY) + babyjub.order;
    }
    return babyjub.addPoint(babyjub.mulPointEscalar(G, rZ), babyjub.mulPointEscalar(H, (vX - vY) % babyjub.order));
}

/**
 * Verifies that the commitment given is the same
 * 
 * @param {*} H - secondary point
 * @param {*} C - commitment
 * @param {*} r - blinding factor private key used to create the commitment
 * @param {*} v - original value committed to
 */
 async function verify(H, C, r, v) {
    babyjub = await buildBabyjub(); 
    G = babyjub.Generator
    let res = babyjub.addPoint(babyjub.mulPointEscalar(G, r % babyjub.order), babyjub.mulPointEscalar(H, v));
    return babyjub.F.eq(res[0], C[0]) && babyjub.F.eq(res[1], C[1]);
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

/*
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

var H = generateH()

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

 * Verifies that the commitment given is the same
 * 
 * @param {*} H - secondary point
 * @param {*} C - commitment
 * @param {*} r - blinding factor private key used to create the commitment
 * @param {*} v - original value committed to
function verify(H, C, r, v) {
    return G.multiply(r % CURVE.n).add(H.multiply(v)).equals(C);
}

 */

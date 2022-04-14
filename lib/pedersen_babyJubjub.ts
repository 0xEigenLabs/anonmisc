var cryptolib = require('crypto')
let cls = require('circomlibjs')
let babyjub
let G

async function generateRandom() {
    babyjub = await cls.buildBabyjub(); 
    let random;
    do {
        random = BigInt("0x" + cryptolib.randomBytes(32).toString('hex'));
    } while (random >= babyjub.order); // make sure it's in the safe range
    return random;
}

async function generateH() {
    babyjub = await cls.buildBabyjub();
    G = babyjub.Generator
    return babyjub.mulPointEscalar(G, await generateRandom())
}

// var H = generateH()

// commit to a Value X
//   r - private Key used as blinding factor
//   H - shared private? point on the curve
async function commitTo(H, r, x) {
    babyjub = await cls.buildBabyjub();
    G = babyjub.Generator
    return babyjub.addPoint(babyjub.mulPointEscalar(G, r % babyjub.order), babyjub.mulPointEscalar(H, x))
}

// sum two commitments using homomorphic encryption
async function add(Cx, Cy) {
    babyjub = await cls.buildBabyjub(); 
    return babyjub.addPoint(Cx, Cy);
}

// subtract two commitments using homomorphic encryption
async function sub(Cx, Cy) {
    babyjub = await cls.buildBabyjub(); 
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
    babyjub = await cls.buildBabyjub(); 
    G = babyjub.Generator
    var rZ = (rX + rY) % babyjub.order;
    return babyjub.addPoint(babyjub.mulPointEscalar(G, rZ), babyjub.mulPointEscalar(H, (vX + vY) % babyjub.order));
}

// subtract two known values with blinding factors
//   and compute the committed value
//   add rX - rY (blinding factor private keys)
//   add vX - vY (hidden values)
async function subCommitment(H, rX, rY, vX, vY) {
    babyjub = await cls.buildBabyjub(); 
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
    babyjub = await cls.buildBabyjub(); 
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
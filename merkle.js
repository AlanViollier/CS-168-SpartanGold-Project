"use strict";

const utils = require('./utils.js');

// Stores transactions in a MerkleTree format.
// The tree will be perfectly balanced.
class FixedMerkleTree {

  // Creates an empty merkle tree with the max amount of transactions
  constructor(maxTx) {
    // Max transactions 
    this.maxTransactions = maxTx;

    // Actual transactions
    this.transactions = [];
    // Filling them up with maxTransacions amount of spaces.
    for(let i = 0; i < this.maxTransactions; i++) {
      this.transactions.push(" ");
    }

    // Transaction hashes
    this.hashes = [];

    // hash-to-index Lookup table
    this.lookup = {};

    this.build();
  }

  // Build out the MerkleTree with current transactions.
  build() {
    // Merkle tree size.
    let numBalancedTree = this.constructor.calculateSize(this.maxTransactions);
    // First transaction position
    let firstTransaction = Math.floor(numBalancedTree / 2);
    // Adds the hashes for the transactions only
    for (let i=firstTransaction; i<numBalancedTree; i++) {
      let v = this.transactions[i-firstTransaction];
      let h;
      if(v == " ") {
        h = utils.hash(v);
      }
      else {
        h = utils.hash(v.getid());
      }
      this.hashes[i] = h;
      this.lookup[h] = i;
    }

    // Completing inner nodes of Merkle tree
    for (let i=firstTransaction+1; i<this.hashes.length; i+=2) {
      this.constructor.hashToRoot(this.hashes, i);
    }
  }

  // Checks to see if the merkle tree is full according to it's max size.
  isFull() {
    if(this.transactions[this.maxTransactions-1]==" ") {
      return false;
    }
    return true;
  }

  // Adds a transaction to the merkle tree and rebuilds it.
  addTx(tx) { 
    // Check to see if it already full.
    if(this.isFull()) {
      console.log("This block is full!");
      return;
    }
    // Finds the next empty space and adds it.
    for(let i = 0; i<this.maxTransactions; i++) {
      if(this.transactions[i] == " ") {
        this.transactions[i] = tx;
        break;
      }
    }
    // Rebuild.
    this.build();
  }

  // Returns a transaction at the specified location.
  getTransaction(num) {
    return this.transactions[num];
  }

  // Returns all actual transactions without the spaces.
  getAllTransactions() {
    let allTransactions = [];
    for(let i = 0; i < this.transactions.length; i++) {
      if(this.transactions[i] != " ") {
        allTransactions.push(this.transactions[i]);
      }
    }
    return allTransactions;
  }


  // Returns the size
  static calculateSize(numElems) {
    // Calculate a power of 2 at least as large as numElems.
    let n = 1;
    while (n < numElems) {
      n *= 2;
    }
    // We need almost double the space to hold the parent hashes.
    // E.g. if we have 8 transactions, we need to store their 8
    // hashes plus the 7 parent hashes.
    return (n * 2) - 1;
  }

  // Hashes from a node to the Merkle root, or until it does not have
  // the other half of the hash needed to continue to the root.
  static hashToRoot(hashes, i) {
    if (i === 0) return;
    let par = (i-2)/2;
    hashes[par] = utils.hash("" + hashes[i-1] + "," + hashes[i]);

    // Test to see if we are the right subnode.  If so, we can hash
    // with the left subnode to continue one level up.
    if (par%2 === 0) {
      this.hashToRoot(hashes, par);
    }
  }

  // Returns the Merkle root
  getroot() {
    return this.hashes[0];
  }

  getPath(transaction) {
    let h = utils.hash(transaction.getid());
    let i = this.lookup[h];
    let path = { txInd: i };

    //
    // **YOUR CODE HERE**
    //
    // Starting at i, build up a path to the root, containing ONLY the nodes
    // needed to reconstruct the Merkle root.  Include their position in the
    // array so that a user who knows only the path and the Merkle root can
    // verify the path.

    let currentPosition = i;
    let pseudopath = [currentPosition];
    while(currentPosition != 0) {
      let tempPosition = 0;
      let nextPosition = 0;
      for(let j = 0; j < this.hashes.length; j++) {
        let hashCheck = "";
        if(currentPosition < j) {
          hashCheck = utils.hash("" + this.hashes[currentPosition] + "," + this.hashes[j]);
        }
        else {
          hashCheck = utils.hash("" + this.hashes[j] + "," + this.hashes[currentPosition]);
        }
        if(this.hashes.includes(hashCheck)) {
          tempPosition = j;
          nextPosition = this.hashes.indexOf(hashCheck);
          break;
        } 
      }
      if(tempPosition == 0) {
        break;
      }
      pseudopath.push(tempPosition);
      currentPosition = nextPosition;
    }

    console.log(pseudopath);
    path["Path"] = pseudopath;

    return path;
  }

  // Return true if the tx matches the path.
  verify(tx, path) {
    let i = path.txInd;
    let h = utils.hash(tx.getid());

    //
    // **YOUR CODE HERE**
    //
    // starting at i, hash the appropriate nodes and verify that their hashes
    // match their parent nodes, until finally hitting the Merkle root.
    // If the Merkle root matches the path, return true.

    let nodes = path.Path;
    if(!nodes.includes(1) && !nodes.includes(2)) {
      return false;
    }
    let valid = true;
    let currentParent = Math.ceil(i/2)-1;
    let currentNode = i;
    for(let j = 1; j < nodes; j++) {
      let nextNode = nodes[j];

      let hashCheck = "";
      if(currentNode < nextNode) {
        hashCheck = utils.hash("" + this.hashes[currentNode] + "," + this.hashes[nextNode]);
      }
      else {
        hashCheck = utils.hash("" + this.hashes[nextNode] + "," + this.hashes[currentNode]);
      }
      if(hashCheck !== this.hashes[currentParent]) {
        valid = false;
      }
      currentNode = currentParent;
      currentParent = Math.ceil(currentNode/2)-1;

    }

    return valid;
  }

  // Returns a boolean indicating whether this node is part
  // of the Merkle tree.
  has(tx) {
    let h = utils.hash(tx.getid());
    return this.lookup[h] !== undefined;
  }

  // Method to print out the tree, one line per level of the tree.
  // Note that hashes are truncated to 6 characters for the sake
  // of brevity.
  display() {
    let i = 0;
    let nextRow = 0;
    let s = "";

    console.log();

    while (i < this.hashes.length) {
      // Truncating hashes for the sake of readability
      s += this.hashes[i].slice(0,6) + " ";
      if (i === nextRow) {
        console.log(s);
        s = "";
        nextRow = (nextRow+1) * 2;
      }
      i++;
    }
  }
}


exports.FixedMerkleTree = FixedMerkleTree;


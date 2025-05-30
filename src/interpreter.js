require('dotenv').config();
const fs = require('fs');
const express = require('express');
const axios = require('axios');
const { parseMiltov } = require('./parser'); // Ensure parser.js exports parseMiltov

// === EVALUATOR ===

function evaluate(node) {
  switch (node.type) {
    case 'Program':
      node.body.forEach(statement => evaluate(statement));
      break;
    case 'PrintStatement':
      return evaluatePrintStatement(node);
    case 'Literal':
      return node.value;
    case 'BinaryExpression':
      return evaluateBinaryExpression(node);
    case 'UnaryExpression':
      return evaluateUnaryExpression(node);
    case 'Identifier':
      return node.name; // Update if implementing variable resolution
    case 'ExpressionStatement':
      return evaluate(node.expression);
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

function evaluatePrintStatement(node) {
  const evaluatedArgs = node.arguments.map(arg => evaluate(arg));
  console.log(...evaluatedArgs);
}

function evaluateBinaryExpression(node) {
  const left = evaluate(node.left);
  const right = evaluate(node.right);

  switch (node.operator) {
    case 'PLUS': return left + right;
    case 'MINUS': return left - right;
    case 'MULTIPLY': return left * right;
    case 'DIVIDE': return left / right;
    case 'EQUAL_EQUAL': return left === right;
    case 'NOT_EQUAL': return left !== right;
    case 'GREATER': return left > right;
    case 'LESS': return left < right;
    case 'GTE': return left >= right;
    case 'LTE': return left <= right;
    default:
      throw new Error(`Unknown binary operator: ${node.operator}`);
  }
}

function evaluateUnaryExpression(node) {
  const arg = evaluate(node.argument);
  switch (node.operator) {
    case '-': return -arg;
    default:
      throw new Error(`Unknown unary operator: ${node.operator}`);
  }
}

// === ROBLOX BOT ===

class RobloxBot {
  constructor(cookie) {
    this.cookie = cookie;
    this.xcsrfToken = null;
    this.http = axios.create({
      baseURL: 'https://www.roblox.com',
      headers: { Cookie: `.ROBLOSECURITY=${this.cookie}` },
    });
  }

  async _fetchXcsrfToken() {
    if (this.xcsrfToken) return this.xcsrfToken;
    try {
      await this.http.post('/my/change-password', {});
    } catch (err) {
      const token = err.response?.headers['x-csrf-token'];
      if (token) {
        this.xcsrfToken = token;
        this.http.defaults.headers['X-CSRF-TOKEN'] = token;
        return token;
      }
    }
    throw new Error('Failed to fetch Roblox X-CSRF-TOKEN');
  }

  async getUserId() {
    const res = await this.http.get('/mobileapi/userinfo');
    return res.data.UserID;
  }

  async getBalance() {
    const res = await this.http.get('/economy/balance');
    return res.data.Robux;
  }

  async getUserProfile(userId) {
    const res = await this.http.get(`https://users.roblox.com/v1/users/${userId}`);
    return res.data;
  }

  async getPlayerGroups(userId) {
    const res = await this.http.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    return res.data.data;
  }

  async setRank(groupId, userId, rankId) {
    await this._fetchXcsrfToken();
    return this.http.patch(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, { rankId });
  }

  async awardBadge(badgeId, userId) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://badges.roblox.com/v1/badges/${badgeId}/users/${userId}`);
  }

  async buyAsset(assetId) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://economy.roblox.com/v1/purchases/products/${assetId}`, {});
  }

  async sendFriendRequest(userId) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://friends.roblox.com/v1/users/${userId}/request-friendship`);
  }

  async acceptFriendRequest(userId) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://friends.roblox.com/v1/users/${userId}/accept-friendship`);
  }

  async declineFriendRequest(userId) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://friends.roblox.com/v1/users/${userId}/decline-friendship`);
  }

  async getFriends(userId) {
    const res = await this.http.get(`https://friends.roblox.com/v1/users/${userId}/friends`);
    return res.data.data;
  }

  async getAssetInfo(assetId) {
    const res = await this.http.get(`https://catalog.roblox.com/v1/assets/${assetId}/details`);
    return res.data;
  }

  async getGroupInfo(groupId) {
    const res = await this.http.get(`https://groups.roblox.com/v1/groups/${groupId}`);
    return res.data;
  }

  async postShout(groupId, message) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://groups.roblox.com/v1/groups/${groupId}/status`, { message });
  }

  async getShout(groupId) {
    const res = await this.http.get(`https://groups.roblox.com/v1/groups/${groupId}/status`);
    return res.data;
  }

  async joinGroup(groupId) {
    await this._fetchXcsrfToken();
    return this.http.post(`https://groups.roblox.com/v1/groups/${groupId}/users`);
  }

  async leaveGroup(groupId) {
    await this._fetchXcsrfToken();
    const userId = await this.getUserId();
    return this.http.delete(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`);
  }

  async getInventory(userId) {
    const res = await this.http.get(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles`);
    return res.data.data;
  }

  async getPlayerPresence(userId) {
    const res = await this.http.get(`https://presence.roblox.com/v1/presence/users`, { params: { userIds: userId } });
    return res.data;
  }
}

// === WEB BACKEND ===

class WebBackend {
  constructor() {
    this.app = express();
    this.app.use(express.json());
  }

  start(port = 3000) {
    this.app.get('/', (req, res) => {
      res.send('Miltov Web Backend is running!');
    });

    this.app.post('/api/data', (req, res) => {
      console.log('Received data:', req.body);
      res.json({ success: true, received: req.body });
    });

    this.app.listen(port, () => {
      console.log(`Web backend started on port ${port}`);
    });
  }
}

// === MILTOV INTERPRETER ===

class MiltovInterpreter {
  constructor(miltovFile, robloxCookie) {
    this.miltovFile = miltovFile;
    this.roblox = new RobloxBot(robloxCookie);
    this.web = new WebBackend();
  }

  async run() {
    const source = fs.readFileSync(this.miltovFile, 'utf-8');
    const program = parseMiltov(source);
    evaluate(program);
  }

  async handleRoblox(command, args) {
    switch (command) {
      case 'getUserId':
        return await this.roblox.getUserId();
      case 'getBalance':
        return await this.roblox.getBalance();
      case 'getUserProfile':
        return await this.roblox.getUserProfile(args[0]);
      case 'getPlayerGroups':
        return await this.roblox.getPlayerGroups(args[0]);
      case 'setRank':
        return await this.roblox.setRank(args[0], args[1], Number(args[2]));
      case 'awardBadge':
        return await this.roblox.awardBadge(args[0], args[1]);
      case 'buyAsset':
        return await this.roblox.buyAsset(args[0]);
      case 'sendFriendRequest':
        return await this.roblox.sendFriendRequest(args[0]);
      case 'acceptFriendRequest':
        return await this.roblox.acceptFriendRequest(args[0]);
      case 'declineFriendRequest':
        return await this.roblox.declineFriendRequest(args[0]);
      case 'getFriends':
        return await this.roblox.getFriends(args[0]);
      case 'getAssetInfo':
        return await this.roblox.getAssetInfo(args[0]);
      case 'getGroupInfo':
        return await this.roblox.getGroupInfo(args[0]);
      case 'postShout':
        return await this.roblox.postShout(args[0], args.slice(1).join(' '));
      case 'getShout':
        return await this.roblox.getShout(args[0]);
      case 'joinGroup':
        return await this.roblox.joinGroup(args[0]);
      case 'leaveGroup':
        return await this.roblox.leaveGroup(args[0]);
      case 'getInventory':
        return await this.roblox.getInventory(args[0]);
      case 'getPlayerPresence':
        return await this.roblox.getPlayerPresence(args[0]);
      default:
        throw new Error(`Unknown roblox command: ${command}`);
    }
  }

  async handleWeb(command, args) {
    switch (command) {
      case 'startServer':
        const port = args[0] ? Number(args[0]) : 3000;
        this.web.start(port);
        return `Web backend started on port ${port}`;
      default:
        throw new Error(`Unknown web command: ${command}`);
    }
  }
}

// === CLI ENTRY POINT ===

(async () => {
  if (process.argv.length < 4) {
    console.log('Usage: node miltov-interpreter.js <script.miltov> <ROBLOX_COOKIE>');
    process.exit(1);
  }
  const scriptFile = process.argv[2];
  const robloxCookie = process.argv[3];

  const interpreter = new MiltovInterpreter(scriptFile, robloxCookie);
  await interpreter.run();
})();

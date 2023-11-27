"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var product_1 = require("./entity/product");
var amqp = require("amqplib/callback_api");
var data_source_1 = require("./data-source");
data_source_1.AppDataSource.initialize().then(function (db) {
    connect(db);
});
// createConnection({
//   type: "mysql",
//   url: process.env.DATABASE_URL,
//   entities: [__dirname + "/entity/*.js"],
//   synchronize: true,
//   logging: true,
// }).then((db) => {
//   connect(db);
// });
function connect(db) {
    var _this = this;
    var productRepository = db.getRepository(product_1.Product);
    amqp.connect(process.env.RABBIT_MQ_URL, function (error0, connection) {
        if (error0) {
            //throw error0;
            console.error("Failed to connect, retrying...", error0);
            setTimeout(function () { return connect(db); }, 5000); // Retry every 5 seconds
        }
        else {
            connection.createChannel(function (error1, channel) {
                if (error1) {
                    throw error1;
                }
                var app = express();
                app.use(cors({
                    origin: [
                        "http://localhost:".concat(process.env.ADMIN_FRONTEND_PORT),
                        "http://localhost:8080",
                        "http://localhost:4200",
                    ],
                }));
                app.use(express.json());
                app.get("/", function (req, res) {
                    res.send("Hello from Admin API");
                });
                app.get("/api/products", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var products;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, productRepository.find()];
                            case 1:
                                products = _a.sent();
                                res.json(products);
                                return [2 /*return*/];
                        }
                    });
                }); });
                app.post("/api/products", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var product, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, productRepository.create(req.body)];
                            case 1:
                                product = _a.sent();
                                return [4 /*yield*/, productRepository.save(product)];
                            case 2:
                                result = _a.sent();
                                channel.sendToQueue("product_created", Buffer.from(JSON.stringify(result)));
                                return [2 /*return*/, res.send(result)];
                        }
                    });
                }); });
                app.get("/api/products/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var product;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, productRepository.findOneBy({
                                    id: Number(req.params.id),
                                })];
                            case 1:
                                product = _a.sent();
                                return [2 /*return*/, res.send(product)];
                        }
                    });
                }); });
                app.put("/api/products/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var product, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, productRepository.findOneBy({
                                    id: Number(req.params.id),
                                })];
                            case 1:
                                product = _a.sent();
                                productRepository.merge(product, req.body);
                                return [4 /*yield*/, productRepository.save(product)];
                            case 2:
                                result = _a.sent();
                                channel.sendToQueue("product_updated", Buffer.from(JSON.stringify(result)));
                                return [2 /*return*/, res.send(result)];
                        }
                    });
                }); });
                app.delete("/api/products/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, productRepository.delete(req.params.id)];
                            case 1:
                                result = _a.sent();
                                channel.sendToQueue("product_deleted", Buffer.from(req.params.id));
                                return [2 /*return*/, res.send(result)];
                        }
                    });
                }); });
                app.post("/api/products/like", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var title, product, result, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                title = req.body.title;
                                if (!title) {
                                    return [2 /*return*/, res.status(400).send({ error: "Product title is required" })];
                                }
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, , 5]);
                                return [4 /*yield*/, productRepository.findOne({
                                        where: {
                                            title: title,
                                        },
                                    })];
                            case 2:
                                product = _a.sent();
                                if (!product) {
                                    return [2 /*return*/, res.status(404).send({ error: "Product not found" })];
                                }
                                product.likes++;
                                return [4 /*yield*/, productRepository.save(product)];
                            case 3:
                                result = _a.sent();
                                return [2 /*return*/, res.send(result)];
                            case 4:
                                error_1 = _a.sent();
                                console.log(error_1);
                                return [3 /*break*/, 5];
                            case 5: return [2 /*return*/];
                        }
                    });
                }); });
                console.log("Listening to port: " + process.env.PORT);
                app.listen(process.env.PORT);
                process.on("beforeExit", function () {
                    console.log("closing");
                    connection.close();
                });
            });
        }
    });
}

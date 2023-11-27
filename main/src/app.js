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
var amqp = require("amqplib/callback_api");
var product_1 = require("./entity/product");
var axios_1 = require("axios");
var data_source_1 = require("./data-source");
data_source_1.AppDataSource.initialize().then(function (db) {
    connect(db);
});
function connect(db) {
    var _this = this;
    var productRepository = db.getMongoRepository(product_1.Product);
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
                //declaring queues for each event
                channel.assertQueue("product_created", { durable: false });
                channel.assertQueue("product_updated", { durable: false });
                channel.assertQueue("product_deleted", { durable: false });
                var app = express();
                app.use(cors({
                    origin: [
                        "http://localhost:".concat(process.env.MAIN_FRONTEND_PORT),
                        "http://localhost:8080",
                        "http://localhost:4200",
                    ],
                }));
                app.use(express.json());
                //consuming messages from the queue
                channel.consume("product_created", function (msg) { return __awaiter(_this, void 0, void 0, function () {
                    var eventProduct, product;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                eventProduct = JSON.parse(msg.content.toString());
                                product = new product_1.Product();
                                product.admin_id = parseInt(eventProduct.id);
                                product.title = eventProduct.title;
                                product.image = eventProduct.image;
                                product.likes = eventProduct.likes;
                                return [4 /*yield*/, productRepository.save(product)];
                            case 1:
                                _a.sent();
                                console.log("product created");
                                return [2 /*return*/];
                        }
                    });
                }); }, { noAck: true });
                channel.consume("product_updated", function (msg) { return __awaiter(_this, void 0, void 0, function () {
                    var eventProduct, product;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                eventProduct = JSON.parse(msg.content.toString());
                                return [4 /*yield*/, productRepository.findOneBy({
                                        admin_id: parseInt(eventProduct.id),
                                    })];
                            case 1:
                                product = _a.sent();
                                productRepository.merge(product, {
                                    title: eventProduct.title,
                                    image: eventProduct.image,
                                    likes: eventProduct.likes,
                                });
                                return [4 /*yield*/, productRepository.save(product)];
                            case 2:
                                _a.sent();
                                console.log("product updated");
                                return [2 /*return*/];
                        }
                    });
                }); }, { noAck: true });
                channel.consume("product_deleted", function (msg) { return __awaiter(_this, void 0, void 0, function () {
                    var admin_id;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                admin_id = parseInt(msg.content.toString());
                                return [4 /*yield*/, productRepository.deleteOne({ admin_id: admin_id })];
                            case 1:
                                _a.sent();
                                console.log("product deleted");
                                return [2 /*return*/];
                        }
                    });
                }); });
                app.get("/", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, res.send("Hello from main service")];
                    });
                }); });
                app.get("/api/products", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var products, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, productRepository.find()];
                            case 1:
                                products = _a.sent();
                                return [2 /*return*/, res.send(products)];
                            case 2:
                                error_1 = _a.sent();
                                console.log(error_1);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); });
                app.post("/api/products/:id/like", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var product, products;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.log("Main: product id: " + req.params.id);
                                return [4 /*yield*/, productRepository.findOneBy(req.params.id)];
                            case 1:
                                product = _a.sent();
                                console.log("Main: product: " + product);
                                return [4 /*yield*/, productRepository.find()];
                            case 2:
                                products = _a.sent();
                                products.forEach(function (product) {
                                    console.log("Main: product: " + product.id);
                                });
                                return [4 /*yield*/, axios_1.default.post("http://admin:".concat(process.env.ADMIN_PORT, "/api/products/like"), { title: product.title })];
                            case 3:
                                _a.sent();
                                product.likes++;
                                return [4 /*yield*/, productRepository.save(product)];
                            case 4:
                                _a.sent();
                                return [2 /*return*/, res.send(product)];
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

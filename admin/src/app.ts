import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import { DataSource } from "typeorm";
import { Product } from "./entity/product";
import * as amqp from "amqplib/callback_api";
import { AppDataSource } from "./data-source";

AppDataSource.initialize().then((db) => {
  connect(db);
});

function connect(db: DataSource) {
  const productRepository = db.getRepository(Product);

  amqp.connect(process.env.RABBIT_MQ_URL, (error0, connection) => {
    if (error0) {
      //throw error0;
      console.error("Failed to connect, retrying...", error0);
      setTimeout(() => connect(db), 5000); // Retry every 5 seconds
    } else {
      connection.createChannel((error1, channel) => {
        if (error1) {
          throw error1;
        }

        const app = express();

        app.use(
          cors({
            origin: "*",
          })
        );

        app.use(express.json());

        app.get("/", (req: Request, res: Response) => {
          res.send("Hello from Admin API");
        });

        app.get("/api/products", async (req: Request, res: Response) => {
          const products = await productRepository.find();
          res.json(products);
        });

        app.post("/api/products", async (req: Request, res: Response) => {
          const product = productRepository.create(req.body);
          const result = await productRepository.save(product);
          channel.sendToQueue(
            "product_created",
            Buffer.from(JSON.stringify(result))
          );
          return res.send(result);
        });

        app.get("/api/products/:id", async (req: Request, res: Response) => {
          const product = await productRepository.findOneBy({
            id: Number(req.params.id),
          });
          return res.send(product);
        });

        app.put("/api/products/:id", async (req: Request, res: Response) => {
          const product = await productRepository.findOneBy({
            id: Number(req.params.id),
          });
          productRepository.merge(product, req.body);
          const result = await productRepository.save(product);
          channel.sendToQueue(
            "product_updated",
            Buffer.from(JSON.stringify(result))
          );
          return res.send(result);
        });

        app.delete("/api/products/:id", async (req: Request, res: Response) => {
          const result = await productRepository.delete(req.params.id);
          channel.sendToQueue("product_deleted", Buffer.from(req.params.id));
          return res.send(result);
        });

        // app.post("/api/products/like", async (req: Request, res: Response) => {
        //   const admin_id = req.body.admin_id;

        //   if (!admin_id) {
        //     return res.status(400).send({ error: "No id provided" });
        //   }

        //   try {
        //     const product = await productRepository.findOne({
        //       where: {
        //         id: admin_id,
        //       },
        //     });
        //     if (!product) {
        //       return res.status(404).send({ error: "Product not found" });
        //     }
        //     product.likes++;
        //     const result = await productRepository.save(product);
        //     return res.send(result);
        //   } catch (error) {
        //     console.log(error);
        //   }
        // });

        // Consume messages from the product_liked queue
        channel.assertQueue("product_liked", { durable: false });
        channel.consume(
          "product_liked",
          async (msg) => {
            const { admin_id } = JSON.parse(msg.content.toString());

            if (!admin_id) {
              console.error("No admin_id provided in the message");
              return;
            }

            try {
              const product = await productRepository.findOne({
                where: {
                  id: admin_id,
                },
              });
              if (!product) {
                console.error("Product not found");
                return;
              }
              product.likes++;
              await productRepository.save(product);
              console.log(`Product with admin_id ${admin_id} liked`);
            } catch (error) {
              console.error("Error processing product_liked message", error);
            }
          },
          { noAck: true }
        );

        console.log("Listening to port: " + process.env.PORT);
        app.listen(process.env.PORT);
        process.on("beforeExit", () => {
          console.log("closing");
          connection.close();
        });
      });
    }
  });
}

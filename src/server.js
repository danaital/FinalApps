/* jshint esversion: 6 */
"use strict";

// requires
const json = require("json");
const shortid = require("shortid");
const cookieParser = require("cookie-parser");
const express = require("express");
const redis = require("redis");
const path = require("path");
const cors = require("cors");
const bodyParse = require("body-parser");
const session = require("express-session");
const connectRedis = require("connect-redis");
const fetch = require("node-fetch");

// connect sessions with Redis
const redisStore = connectRedis(session);

//useful constants
const port = process.env.PORT || 3001;
const redisClient = redis.createClient({host: "127.0.0.1", port: 6379});
const app = express();
const imagesPath = '/images';

// let app express use modules
app.use(bodyParse.json());
app.use(bodyParse.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({
    store: new redisStore({client: redisClient}),
    secret: '123',
    saveUninitialized: false,
    resave: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 30, // session max age in miliseconds
    }
}));

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// connect to redis
redisClient.on("connect", function () {
    console.log("You are now connected");
});

// Error Handler Class
class ErrorHandler extends Error {
    constructor(statusCode, message) {
        super();
        this.statusCode = statusCode;
        this.message = message;
    }
}

const handleError = (err, res) => {
    const {statusCode, message} = err;
    res.setHeader('Content-Type', 'application/json');
    res.status(statusCode).json({
        status: "error",
        statusCode,
        message
    });
};

/** This async function is creating a user and inserting to db
 *  due to redis accessibility is a-Sync that means the entire func' must be a-sync
 */
app.post('/register', async (req, res, next) => {
        // error handling one of the values is defined..
        if (req.session.key) {
            try {
                throw new ErrorHandler(401, "Already Logged In");
            } catch (err) {
                next(err);
            }
            return;
        }
        if (req.body.email.valueOf() === undefined || req.body.password.valueOf() === undefined || req.body.name.valueOf() === undefined) {
            try {
                throw new ErrorHandler(400, "Missing Data in the request");
            } catch (err) {
                next(err);
            }
            return;
        }
        // generate new id depending on the type of object in order in insert to first hash key
        let id = generateNewIDforObject("user");
        // check validity of email if is not valid. go to next, we want to wait here for data to return
        let emailVal = await checkValitdyEmail(req.body.email, req.body.remail);
        //error handling
        if (emailVal !== true) {
            // email not the same
            if (emailVal === "Not the same") {
                try {
                    throw new ErrorHandler(401, "Not the same email");
                } catch (err) {
                    next(err);
                }
                return;
            }
            // email is taken
            if (emailVal === "Taken") {
                try {
                    throw new ErrorHandler(401, "Please enter a different email");
                } catch (err) {
                    next(err);
                }
                return;
            }
            try {
                throw new ErrorHandler(500, "Unexpected Error");
            } catch (err) {
                next(err);
            }
            return;
        }
        //check validity of password if is not valid. go to next
        let passVal = checkValidityPass(req.body.password, req.body.rpassword);
        //error handling
        if (passVal !== true) {
            if (passVal === "illegal pass") {
                try {
                    throw new ErrorHandler(403, (`this password is illegal, you must include at least
    - 1 digit (0-9)
    - 1 capital letter (A-Z)
    - 1 small letters (a-z)
    - 6-12 characteres 
    `));
                } catch (err) {
                    next(err);
                }
                return;
            }
            if (passVal === "not same pass") {
                try {
                    throw new ErrorHandler(403, "Not the same password");
                } catch (err) {
                    next(err);
                }
            }
            try {
                throw new ErrorHandler(500, "Unexpected error");
            } catch (err) {
                next(err);
            }
            return;
        }
        // creating a user
        let user = {
            id: id,
            password: req.body.password,
            name: req.body.name,
            email: req.body.email,
            logins: [], // contains date,hours in UTC, Local time
            purchases: [], //contains , purchase object that includes, cart purchases , date, and user info for delivery , after purchase clear cart
            cart: [],         // will be set in the session  at login
            sessions: [],   // list of all sessions
            permission_level: 2,// regular users
            incorrect_tries: 0, // current number of recent wrong pass word
            locked_expires: new Date().toUTCString(), //current last block
            lock_time_multiplier: 0, // current lock multiplier
            products_liked: []
        };
        // set the user into db , hashed
        redisClient.hset('users', id, JSON.stringify(user), (err, results) => {
            if (err) console.log(err);
        });
        res.status(200).json(user);
    }
);

/**This function is for logging in the user and sets values in his session
 */
app.post('/login', async (req, res, next) => {
    // getting the parameter from the request
    if (req.session.key) {
        try {
            throw new ErrorHandler(401, 'Already logged in');
        } catch (err) {
            next(err);
        }
        return;
    }
    let email = req.body.email;
    let pass = req.body.password;
    // Case handling the email or password is not given in HTTP req
    if (email.valueOf() === undefined || pass.valueOf() === undefined) {
        try {
            throw new ErrorHandler(400, "Missing Data");
        } catch (err) {
            next(err);
        }
        return;
    }
    // checking if there is a user with this email and the password matches
    let ans = (await checkEmailPassword(email, pass));
    // error handling
    if (ans !== true) {
        if (ans === "not registered") {
            try {
                throw new ErrorHandler(401, "Please Register or enter another mail");
            } catch (err) {
                next(err);
            }
            return;
        }
        if (ans === "Password Is Incorrect") {
            try {
                throw new ErrorHandler(403, "Wrong password");
            } catch (err) {
                next(err);
            }
            return;
        }
        try {
            throw new ErrorHandler(500, "Unexpected error");
        } catch (err) {
            next(err);
        }
        return;
    }
    // finds the user which has the value of the email given as is value
    let user = (await whereSQLmain("users", "email", email).valueOf())[0];// user[0] -> since it returns in the let user line as an array with 1 value
    // give the current date in UTC.
    let date = new Date().toUTCString();
    // Pushes the last date in the logins array. and we want to wait for that
    let newLogins = await pushItemToObject(user, "logins", date);
    // We Update the DB accordingly
    await updateObjectIndb("users", user, "logins", newLogins);
    req.session.key = user.id;
    req.session.cart = user.cart;
    if (req.body.rememberme === true) {
        req.session.cookie.maxAge = 2147483647;
    }
    let newSessions = await pushItemToObject(user, "sessions", req.session.id);
    await updateObjectIndb("users", user, "sessions", newSessions);
    res.status(200).json(user);
    console.log("Log In Successfully");
});

/**
 * Get the user's info while using if he has an active session
 */
app.get('/connected-user', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, 'Not Logged In');
        } catch (err) {
            next(err);
        }
        return;
    }
    const user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    res.status(200).send(user);
});

app.get('/testnr', async (req, res, next) => {
    res.status(200).send("OK node red here");
});
/** This Function is logout function, and destroys the session
 */
app.post('/logout', function (req, res, next) {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, 'Already Logged Out');
        } catch (err) {
            next(err);
        }
        return;
    } else {
        req.session.destroy(function (err) {
            if (err) {
                console.log(err);
            }
        });
        res.clearCookie('connect.sid', {path: '/'}).status(200).send({message: "Logged Out Successfully"});
    }
});


/**Temp method for main page
 * maybe change to redirection to the main store?
 */
app.get('/', (req, res) => {
    res.send("Hello");
});

/** This function is admin only function , and returns all the non admin users data exluding the password from db
 */
app.post('/admin/users', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Not an Admin");
        } catch (err) {
            next(err);
        }
        return;
    }
    let users = (await whereSQLmain("users", "permission_level", 2)).valueOf();
    let usersSend = users.map((user) => {
        delete (user.password);
        return user;
    });
    res.status(200).send(usersSend);
});

/** This function is admin only function , and adding a product to database
 */
app.post('/admin/addproduct', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let id = generateNewIDforObject("product");

    let path1 = `${imagesPath}/${req.body.image}`;
    if (!path1) {
        //error image not found
        try {
            throw new ErrorHandler(500, "Picture not in found");
        } catch (err) {
            next(err);
        }
        return;
    }
    // soft since ints will be string
    if (Number(req.body.price) != req.body.price && Number(req.body.price) <= 0) {
        //error
        try {
            throw new ErrorHandler(500, "Invalid price");
        } catch (err) {
            next(err);
        }
        return;

    }
    let product = {
        id: id,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        image: path1,
        color: req.body.color,// 6 digit hex
        price: req.body.price,
        rating: 0,
        usersVoted: [],
        sumratings: 0,
        numvote: 0,
        users_likes: []
    };
    redisClient.hset('products', id, JSON.stringify(product), (err, results) => {
        if (err) console.log(err);
    });
});

/** This function is admin only function , and its edit a product that exists in the database by giving it's product's id
 */
app.post('/admin/editproduct', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;

    }
    let product = (await whereSQLmain("products", "id", req.body.productID)).valueOf()[0];
    if (!product) {
        try {
            throw new ErrorHandler(500, "Product not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    let field = req.body.field;
    if (field === "id") {
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;

    }
    let newValue = req.body.newValue;
    if (field === "price") {
        if (Number(newValue) !== newValue && Number(newValue) <= 0) {
            //error
            try {
                throw new ErrorHandler(500, "Price is invalid");
            } catch (err) {
                next(err);
            }
            return;
        }
    } else if (field === "image") {
        newValue = `${imagesPath}/${newValue}`;
        if (!newValue) {
            //error
            try {
                throw new ErrorHandler(500, "Image not in found");
            } catch (err) {
                next(err);
            }
            return;
        }
    } else {
        if (field !== "description" || (field !== "color" || (field.length !== 6 && field.toLowerCase().match("(^\d||[a-f])+")))) {
            res.status(500).send("Error with category name");
            return;
        }
    }

    await updateObjectIndb("products", product, field, newValue);
});
/** This function is admin only function , and given a user in front page, it gives his purchases history
 */
app.post('/admin/purchases', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let wanteduser = (await whereSQLmain("users", "id", req.body.user)).valueOf()[0];
    if (!wanteduser) {
        try {
            throw new ErrorHandler(500, "User not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    res.status(200).json(wanteduser.purchases);
});

/** This function is admin only function , and adding a product to database
 */
app.post('/admin/sessions', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Need to login first");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Not an Admin");
        } catch (err) {
            next(err);
        }
        return;
    }
    let wanteduser = (await whereSQLmain("users", "id", req.body.user)).valueOf()[0];
    if (!wanteduser) {
        try {
            throw new ErrorHandler(500, "Not a user");
        } catch (err) {
            next(err);
        }
        return;
    }
    res.status(200).json(wanteduser.sessions);
});


/** This function allows you to get a product
 *  for product page
 */
app.post('/products/:product', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let prodID = req.params.product;
    let product = (await whereSQLmain("products", "id", prodID)).valueOf()[0];
    if (!product) {
        try {
            throw new ErrorHandler(500, "Product not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    res.status(200).send(product);
});

/** This function allows to add a product from the store to the cart
 *  @param product = (req.params.product), is the product id given
 */
app.post('/products/:product/addtocart', async (req, res, next) => {
    if (!req.session.id) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    let prodID = req.params.product;
    let product = (await whereSQLmain("products", "id", prodID)).valueOf()[0];
    if (!product) {
        try {
            throw new ErrorHandler(500, "Product not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    let cart = user.cart;
    let index = await findProductInCart(cart, product.id);
    if (index < -1) {
        try {
            throw new ErrorHandler(500, "Unexpected error has occurred");
        } catch (err) {
            next(err);
        }
        return;
    }
    let result;
    let newCart;
    if (index !== -1) {
        // exist in cart
        result = cart[index];
        result.quantity += 1;
        cart[index] = result;
        newCart = cart;
    } else {
        //let quantity = 1||req.params.quantity; /:quantity
        result = {product: product, quantity: 1};//quantity:quantity
        //add to cart
        newCart = await pushItemToObject(user, "cart", result);
    }
    // update cart
    await updateObjectIndb("users", user, "cart", newCart);
    req.session.cart = newCart;
    //res.status(200).send(message);
    res.status(200).send(newCart);
});
/** This function allows to raise the quantity of a product that already is the cart by 1
 *  @param product = (req.params.product), is the product id given
 */
app.post('/cart/:product/addone', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    let cart = req.session.cart.valueOf();
    let index = await findProductInCart(cart, req.params.product);
    if (index === -1) {
        //ERROR CONTROL
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let result = cart[index];
    result.quantity += 1;
    cart[index] = result;
    let newCart = cart;
    await updateObjectIndb("users", user, "cart", newCart);
    req.session.cart = newCart;
    res.status(200).send(newCart);
});

/** This function allows to decrease the quantity of a product that already is the cart by 1
 *  @param product = (req.params.product), is the product id given
 */
app.post('/cart/:product/removeone', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (!user) {
        try {
            throw new ErrorHandler(500, "User not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    let cart = req.session.cart.valueOf();
//    let product = (await whereSQLmain("products", "id", req.params.product)).valueOf()[0];
    let index = await findProductInCart(cart, req.params.product);
    if (index === -1) {
        //Quantity = 0 , product not in cart
        try {
            throw new ErrorHandler(403, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let result;
    if (cart[index].quantity <= 0) {
        // unexpected error
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err)
        }
        return;
    }
    if (cart[index].quantity === 1) {
        // if quantity == 1 => removeall
        result = await removeItemFromCart(cart, req.params.product);
    } else {
        // remove 1 items from cart..
        result = await updateQuantityInCart(cart, index, -1);
    }
    await updateObjectIndb("users", user, "cart", result !== undefined ? result : []);
    req.session.cart = result;
    res.status(200).json(req.session.cart);
});
/** This function allows to drop a cart item that already is the cart from the cart
 *  @param product = (req.params.product), is the product id given
 */
app.post('/cart/:product/removeallProduct', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    let cart = req.session.cart.valueOf();
    let index = await findProductInCart(cart, req.params.product);
    if (index === -1) {
        //Quan = 0 , item not in cart
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let newCart = await removeItemFromCart(cart, req.params.product);
    await updateObjectIndb("users", user, "cart", newCart !== undefined ? newCart : []);
    req.session.cart = newCart;
    res.status(200).json(req.session.cart);
});
/** This function allows to delete all the products in the cart
 *  @param product = (req.params.product), is the product id given
 */
app.post('/cart/emptycart', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please Login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    req.session.cart = [];
    await updateObjectIndb("users", user, "cart", []);
    res.status(200).send("Cart was successfully emptied");
});

/** This function peforms a "checkout"
 *  the process includes
 *  A) Check validity from front
 *  B) Add new Purchase to user purchases
 *  C) Clean the cart
 *  @param price = (req.params.price), is the total price given by the
 */
app.post('/checkout/:price', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (req.body.firstName === undefined || req.body.lastName === undefined || req.body.phoneNum === undefined || req.body.country === undefined || req.body.address === undefined || req.body.zipCode === undefined) {
        try {
            throw new ErrorHandler(400, "Missing Data");
        } catch (err) {
            next(err);
        }
        return;
    }
    let userInfo = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phoneNum: req.body.phoneNum,
        country: req.body.country,
        address: req.body.address,
        zipCode: req.body.zipCode
    };
    let cart = req.session.cart;
    let result = await quancheck(cart);
    if (result === "NOPE") {
        // ERROR with quantities
        try {
            throw new ErrorHandler(500, "Unexpected Error with quantity");
        } catch (err) {
            next(err);
        }
        return;
    }
    let pricecheck = await priceCheck(cart);
    if (pricecheck === 0) {
        //error empty cart
        try {
            throw new ErrorHandler(400, "Can't checkout empty cart");
        } catch (err) {
            next(err);
        }
        return;
    }
    if (pricecheck !== Number(req.params.price)) {
        try {
            throw new ErrorHandler(500, "Unexpected Error with prices");
        } catch (err) {
            next(err);
        }
        return;
    }
    //purchase is valid
    let date = new Date().toUTCString();
    let purchaseObj = {cart: cart, price: pricecheck, date: date, userInfo: userInfo};
    let newPurchases = await pushItemToObject(user, "purchases", purchaseObj);
    await updateObjectIndb("users", user, "purchases", newPurchases);
    await updateObjectIndb("users", user, "cart", []);
    req.session.cart = [];
    res.status(200).json("Purchase complete, You can look in your personal purchases to see it. Thank you for buying at Flint\n" +
        "the place to ignite your camping adventure");
});
/** This function handles the product by name feature in admin
 */
app.post('/search/product', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let productsFind = (await whereSQLmain1("products", "name", req.body.query)).valueOf();
    if (!productsFind) {
        try {
            throw new ErrorHandler(500, "Products were not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    res.status(200).json(productsFind);
});
/** This function handles the search user by name feature in admin
 */
app.post('admin/search/searchuser', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let usersFind = (await whereSQLmain("users", "name", req.body.query)).valueOf();
    res.status(200).json(usersFind);
});
/** This function filters the products shown via category
 *  @param category = (req.params.category), is the product id given
 */
app.get('/categories/:category', async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
    }
    let category = req.params.category;
    let afterFilter;
    if (category === "all") {
        // if category === "general" ->all
        afterFilter = await getAllTypeMain('products');
    } else {
        afterFilter = await whereSQLmain("products", "category", category);
    }
    afterFilter.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    res.status(200).json(afterFilter);
});

/** This function the user to show the purchases activities
 */
app.post('/purchases', async (req, res, next) => {
    // maybe send to this user?
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    res.status(200).json(user.purchases);
});
/** This function allows the admin to show the purchases activities
 */
app.post('/admin/:user/purchases', async (req, res, next) => {
    // maybe send to this user?
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (!user) {
        try {
            throw new ErrorHandler(500, "Unexpected error");
        } catch (err) {
            next(err);
        }
        return;
    }
    if (user.permission_level >= 2) {
        try {
            throw new ErrorHandler(401, "Unauthorized");
        } catch (err) {
            next(err);
        }
        return;
    }
    let userWanted = (await whereSQLmain("users", "name", req.params.user)).valueOf()[0];
    if (!userWanted) {
        try {
            throw new ErrorHandler(500, "Wanted user was not found");
        } catch (err) {
            next(err);
        }
        return;
    }
    res.status(200).json(userWanted.purchases);
});


/** updating the rating of a product
 *
 * @param product - the product given a rating
 * @param rating - the new rating given by user
 */
app.post('/products/:product/rating/:rating', async (req, res, next) => {
    // if not logged in -> error
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    // EXTRA if not purchased and past 14 days -> error please try and enjoy the product before give it a review
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (!user) {
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err);
        }
        return;
    }
    let rating = Number(req.params.rating);
    let validRating = [1, 2, 3, 4, 5].filter(i => i === rating).length;
    if (validRating !== 1) {
        //error
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err);
        }
        return;
    }
    let product = (await whereSQLmain("products", "id", req.params.product)).valueOf()[0];
    let map = (await product.usersVoted.map(obj => obj.id));
    let index = (await map.indexOf(user.id));
    if (index <= -2) {
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err);
        }
        return;
    }
    let newrating;
    let newsumratings;
    let newUserVoted;
    let newNumVoted;
    if (index === -1) {
        // if not voted case A -> get new vote + calculate the rating average
        newNumVoted = product.numvote + 1;
        newUserVoted = await pushItemToObject(product, "usersVoted", {id: user.id, rating: rating});
        newsumratings = product.sumratings + rating;
        newrating = newsumratings / newNumVoted;
        // update to db
        await updateObjectIndb("products", product, "numvote", newNumVoted);
        await updateObjectIndb("products", product, "usersVoted", newUserVoted);
        await updateObjectIndb("products", product, "sumratings", newsumratings);
        await updateObjectIndb("products", product, "rating", newrating);
        res.status(200).json({message: 'Updated Rate'});
    } else {
        // if voted case B -> get old rating from product voted param and req.session.key, calc(newrating-oldrating)
        //                    + calculate the difference
        newNumVoted = product.numvote;
        let alterRating = rating - product.usersVoted[index].rating;
        let newUserVoted = product.usersVoted;
        newUserVoted[index].rating = rating;
        newsumratings = product.sumratings + alterRating;
        newrating = newsumratings / newNumVoted;
        // update to db
        await updateObjectIndb("products", product, "usersVoted", newUserVoted);
        await updateObjectIndb("products", product, "sumratings", newsumratings);
        await updateObjectIndb("products", product, "rating", newrating);
        res.status(200).json({message: 'Updated Rate'});
    }
});

app.post("/products/:product/likeorunlike", async (req, res, next) => {
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (!user) {
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err);
        }
        return;
    }
    let product = (await whereSQLmain("products", "id", req.params.product)).valueOf()[0];
    if (!product) {
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err);
        }
        return;
    }
    let liked_products = user.products_liked;
    let liked_users = product.users_likes;
    if (!findProductInArray(liked_products, req.params.product)) {
        // product is not in likes
        liked_products = await pushItemToObject(user, "products_liked", req.params.product);
        await updateObjectIndb("users", user, "product_liked", liked_products);
        liked_users = await pushItemToObject(product, "users_likes", req.session.key);
        await updateObjectIndb("products", product, "users_likes", liked_users);
    } else {
        // product is liked therefore we want to unlike
        liked_products = await removeProductFromArray(liked_products, req.params.product);
        await updateObjectIndb("users", user, "products_liked", liked_products !== undefined ? liked_products : []);
        liked_users = await removeProductFromArray(liked_users, req.session.key);
        await updateObjectIndb("products", product, "users_likes", liked_users !== undefined ? liked_users : []);
    }
});

app.get("/likedproducts", async (req, res, next) => {
    console.log(1);
    if (!req.session.key) {
        try {
            throw new ErrorHandler(401, "Please login");
        } catch (err) {
            next(err);
        }
        return;
    }
    let user = (await whereSQLmain("users", "id", req.session.key)).valueOf()[0];
    if (!user) {
        try {
            throw new ErrorHandler(500, "Unexpected Error");
        } catch (err) {
            next(err);
        }
        return;
    }
    // func
    let likedProducts = await getCustomListOfProducts(user.products_liked);
    console.log(likedProducts);
    res.status(200).json(likedProducts);
});

/** this function generate new key for user and products
 *  if we run into an old key it regenerate
 *
 * @param type - user \ product
 * @return {string|null}
 */
function generateNewIDforObject(type) {
    //promise
    let newID = shortid.generate();
    if (type === "user" || type === "product") {
        newID = type + "_" + newID;
        while (!redisClient.exists(type + 's', newID)) {
            newID = type + "_" + shortid.generate();
        }
        return newID;
    } else {
        return null;
    }
}

/**
 * this function retrieves all the data of a certain field of a certain type
 * example, all the emails of users, all the prices of product.
 * the main part written here gets all the types form db, the call back transform them
 * @param type = can be user\product; otherwise null
 * @param field = a respective field of the type
 * @param callback = a callback function used to do operation on the data
 * @return  {null|*[]} =a mapped array of all param wanted
 **/

const getAllFieldsByType = (type, field, callback) => {
    return redisClient.hgetall(type, (err, results) => {
        if (err) console.log(err);
        else callback(getValuesByField(results, field));
    });
    // user_key + JSON(object) -> dictionary
};

/** This is a helper function that gets all the types, as key+ value(JSON) and transforms them into
 * an array of the field (all the emails).
 * @param items - the result from getvaluesbyfield
 * @param field - the wanted field
 * @return {*[]} - the array wanted
 *  Base_Status: 100% complete.
 *  Status: 100% complete
 */
const getValuesByField = (items, field) => {
    const allValues = Object.values(items).map(i => JSON.parse(i));//object of objects key+value ->array of objects values(JSON) -> array of values(OBJ)
    return allValues.map(v => v[field]);//array obj->array of obj.field
};

/**
 * this function retrieves all the data of a certain field of a certain type
 * example, all the emails and passwords of users, all the prices and categories of product.
 * the main part written here gets all the types form db, the call back transform them
 * @param type = can be user\product; otherwise null
 * @param field1 = a respective field of the type
 * @param field2 = a respective field of the type
 * @param callback = a callback function used to do operation on the data
 * @return  {string|*[]} =a mapped array of all params wanted
 **/

const getAllFieldsByType1 = (type, field1, field2, callback) => {
    // error handle
    if (field2 === field1) {
        return "same type were chosen";
    }
    // get all type from redis
    return redisClient.hgetall(type, (err, results) => {
        if (err) console.log(err);
        else callback(getValuesByField1(results, field1, field2));// transforms into array [field1,field2]
    });
};


/** This is a helper function that gets all the types, as key+ value(JSON) and transforms them into
 * an array of the field (all the emails).
 * @param items - the result from getvaluesbyfield
 * @param field1 - the wanted field
 * @param field2 - the second wanted field
 * @return {*[]} - the array wanted
 */
const getValuesByField1 = (items, field1, field2) => {
    const allValues = Object.values(items).map(i => JSON.parse(i));// obj of obj key+value(both string) ->array of values(JSON) ->array of values(OBJ)
    return allValues.map(v => [v[field1], v[field2]]);// arr of obj->arr of [obj.field1, obj.field2]
};

/** this function retrieves all of a certain type from db ,
 *  in order to transform the into object
 * @param type - user\product
 * @param callback - the callback function
 * @return {*} - the answer array
 */

const getAllTypeAsObj = (type, callback) => {
    // get all type from redis
    return redisClient.hgetall(type, (err, results) => {
        // results is built as user_key + JSON(object)
        if (err) console.log(err);
        else callback(getallType(results));// tranform into array of objects
    });
};

/** this function transforms all the type from key+value(JSON) into an array of objects according to the type chosen
 *
 * @param items- the result from last function
 * @return {any[]} - the array of objects
 */
const getallType = (items) => {
    if (items === undefined || items === null) return items;
    return Object.values(items).map(i => JSON.parse(i));// object of object (key+value) -> array of objects values(JSON) -> array of objects values(OBJ)
};


/** this function is a redis+js way to handle a request that can be handled via where in SQL
 *  here the get from DB happens .
 *  uses: category + product , updating logins, purchases and more
 * @param type - user\product
 * @param field - the field wanted
 * @param value - the value asked
 * @param callback - the callback function
 * @return {*} - an array of results
 */
const whereSQL = (type, field, value, callback) => {
    // get all type from redis
    return redisClient.hgetall(type, (err, results) => {
        // results is built as user_key + JSON(object)
        if (err) console.log(err);
        else callback(whereSQL1(results, field, value));// filter accordingly returns as array
    });
};
/** this helper function does the translation and filtering according to the values
 *
 * @param items- the result from ealier
 * @param field - the field wanted
 * @param value - the values wanted
 * @return {any[]} - array of results
 */
const whereSQL1 = (items, field, value) => {
    const values = Object.values(items).map(i => JSON.parse(i));// key+value -> values(JSON) -> values(OBJ)
    return values.filter(obj => obj[field] === value);//array of obj=> array of obj filtered
};


/** this function is the main function we want to call . since the redis is async call
 *  I want to resolve and find the result before going on next .
 * @param type - users\products
 * @param field - the field wanted
 * @param value - the value searched
 * @return {Promise<unknown>} - the result wanted as Array
 */
function whereSQLmain(type, field, value) {
    if (field === "password") {
        return null;
    }
    return new Promise((resolve) => {
        whereSQL(type, field, value, (results) => {
            if (results === null) {
                resolve(null);
                return;
            }
            resolve(results);
        })
    })
}

function getAllTypeMain(type) {
    return new Promise(resolve => {
        getAllTypeAsObj(type, (results) => {
            resolve(results);
        });
    })
}

/** this function is the main function we want to call . since the redis is async call
 *  I want to resolve and find the result before going on next .
 * @param type - users\products
 * @param field - the field wanted
 * @param value - the value searched
 * @return {Promise<unknown>} - the result wanted as Array
 */
function whereSQLmain1(type, field, value) {
    if (field === "password") {
        return null;
    }
    return new Promise((resolve) => {
        whereSQLA1(type, field, value, (results) => {
            if (results === null) {
                resolve(null);
                return;
            }
            resolve(results);
        })
    })
}

/** this function is a redis+js way to handle a request that can be handled via where in SQL
 *  here the get from DB happens .
 *  uses: category + product , updating logins, purchases and more
 * @param type - user\product
 * @param field - the field wanted
 * @param value - the value asked
 * @param callback - the callback function
 * @return {*} - an array of results
 */
const whereSQLA1 = (type, field, value, callback) => {
    // get all type from redis
    return redisClient.hgetall(type, (err, results) => {
        // results is built as user_key + JSON(object)
        if (err) console.log(err);
        else callback(whereSQLA2(results, field, value));// filter accordingly returns as array
    });
};
/** this helper function does the translation and filtering according to the values
 *
 * @param items- the result from ealier
 * @param field - the field wanted
 * @param value - the values wanted
 * @return {any[]} - array of results
 */
const whereSQLA2 = (items, field, value) => {
    const values = Object.values(items).map(i => JSON.parse(i));// key+value -> values(JSON) -> values(OBJ)
    return values.filter(obj => obj[field].includes(value) === true);//array of obj=> array of obj filtered
};

/** Checks if the email and password entered are in db and match accordingly
 *
 * @param email - email form login
 * @param password - password entered
 * @return {string|boolean} - > String|false is error, true is OK
 */

async function checkEmailPassword(email, password) {
    return await new Promise(async (resolve) => {
        getAllFieldsByType1("users", "email", "password", async (results) => {
            let emailarr = results.map(i => i[0]);//i => 2D array , each row [email,pass]
            let index = emailarr.indexOf(email);// search for value of email in email array
            if (index === -1) {
                // if cannot found => not in DB => not registered
                resolve("not registered");
                return;
            }
            if (results[index][1] === password) {
                // the respected password is correct
                resolve(true);
            } else {
                // the respected password is incorrect
                resolve("Password Is Incorrect");
            }
        });
    })
}

/** Checks if there is email in db and the two mails that were entered are valid
 *
 * @param email - email form HTTP
 * @param remail - remail from HTTP
 * @return {string|boolean} - string -> error, true-> OK
 */

function checkValitdyEmail(email, remail) {
    if (email !== remail) {
        return "Not the same";
    }
    return new Promise(resolve => {
        // gets all emails
        getAllFieldsByType("users", "email", (results) => {
            // if not found -> can be registered on new account.
            if (results.indexOf(email) === -1) {
                resolve(true);
            } else {
                //if found-> this mail is taken ..
                resolve("Taken");
            }
        });
    })
}

/** Checks if the password given is valid and the two password are identical
 *  this function also built at Front here to check unexpected error
 * @param passA - the first password
 * @param passB - the second password
 * @return {string|boolean} - string -> error, true-> OK
 */
function checkValidityPass(passA, passB) {
    // for the real change to 6
    if (passA === passB && passA.length >= 3) {
        if (passA.toLowerCase() !== passA && passA.toUpperCase() !== passA && /\d/.test(passA) !== false) {
            return true;
        }
        return "illegal pass";
    }
    return "not same pass";
}

/** This function takes an obejct that holds an array in the field chosen and
 *  add the value later
 *  usege-> add last login.
 * @param object - the object wanted
 * @param field - the field wanted
 * @param value - the value to push
 * @return {Promise<unknown>} - the new value of the field.
 */
function pushItemToObject(object, field, value) {
    return new Promise(resolve => {
        object[field].push(value);
        let newField = object[field];
        resolve(newField);
    })
}


/** This async Func' takes an object and set the value back to redis to save the data
 *  after update
 * @param type - users\products
 * @param object - the user\product wanted
 * @param field - the field that we want to change
 * @param newValue - the value after change
 * @return {Promise<string>}- > just a message for debug purpose.
 */
async function updateObjectIndb(type, object, field, newValue) {
    object[field] = newValue;
    await redisClient.hset(type, object.id, JSON.stringify(object), (err, results) => {
        if (err) console.log(err);
    });
    return "OK";
}


/** This function handles the cart , and searches if a product is in the cart using its product id
 * if (returns -1) , not found otherwise returns the index
 * @param cart - the cart (already being identified to a user)
 * @param productID - the product id
 * @return {number} - the index
 */

function findProductInCart(cart, productID) {
    let newCart = cart.map(obj => obj.product.id);
    return newCart.indexOf(productID);
}

/** This fuction handles te cart, and removes the item according to the product object given
 *  and returns the array without the item
 * @param cart - the cart (already being identified to a user)
 * @param productID - the product's ID
 * @return {Promise<unknown>}
 */
function removeItemFromCart(cart, productID) {
    let array = cart.filter(obj => obj.product.id !== productID);
    return new Promise((resolve) => {
        resolve(array);
    });
}

/** this function handles the cart , and updates the quantity accordingly
 *  if decreased too much it will be removed
 * @param cart - the cart (already being identified to a user)
 * @param index -  the product's index in cart
 * @param value - the quantities added/decreased
 * @return {Promise<unknown>}
 */
function updateQuantityInCart(cart, index, value) {
    let temp = value * (-1);
    if (temp >= cart[index].quantity && temp >= 0) {
        return removeItemFromCart(cart, cart[index].product);
    }
    return new Promise((resolve) => {
        let newCart = cart;
        newCart[index].quantity += value;
        resolve(newCart);
    });
}

/** This function handles the cart in checkout operarion
 *  and check that every quantity is vaild (strictly positive)
 * @param cart - the cart (already being identified to a user)
 * @return {Promise<unknown>}
 */
function quancheck(cart) {
    return new Promise(resolve => {
        let len = cart.length;
        let after_check_cart = cart.filter(obj => obj.quantity >= 1);//0| neg
        let len2 = after_check_cart.length;
        if (len === len2) {
            resolve("OK");
        } else {
            resolve("NOPE");
        }
    });
}

/** This function handles the cart in checkout operarion
 *  this is a validation function to the price calculated in the front end
 * @param cart
 * @return {Promise<unknown>}
 */
// cart item {product: Product(object) ,quantity: strictly positive number }
function priceCheck(cart) {
    return new Promise((resolve) => {
        let priceandquan = cart.map(obj => [obj.product.price, obj.quantity]);// 2dARR
        let calc = priceandquan.map(arr => arr[0] * arr[1]);// price*quantity
        resolve(calc.reduce((sum, cur) => sum + cur, 0));
    });
}


function sorter(products, field, asendOrDecend) {
    let newAsendOrDecend = (asendOrDecend - 0.5) * 2; // -1 or 1
    if (!products[0][field]) {
        return "no such field";
    }
    products.sort((a, b) => {
        if (a[field] < b[field]) {
            return -1 * newAsendOrDecend;
        }
        if (a[field] > b[field]) {
            return 1 * newAsendOrDecend;
        }
        return 0;
    });
    return products;
}

// add function get all products from list
// add is product liked by user;


function findProductInArray(arr, productID) {
    return arr.indexOf(productID) !== -1;
}


function removeProductFromArray(arr, productID) {
    let array = arr.filter(key => key !== productID);
    return new Promise((resolve) => {
        resolve(array);
    });
}


async function getCustomListOfProducts(custom_list_of_products) {
    let products = await getAllTypeMain('products');
    let array = products.filter(object => findProductInArray(custom_list_of_products, object.id) === true);
    return new Promise((resolve) => {
        resolve(array);
    });
}

/** This function is helping initing the database
 * if it's not and return a boolean
 * it's waiting for the result from isFirstInit
 * @return {Promise<boolean>}= if the db is empty
 */
async function firstInitAssign() {
    return await isFirstInit();
}


/** This function is helping initing the database
 * if it's not and return a boolean
 *
 * @return {Promise<boolean>}= if the db is empty
 */

function isFirstInit() {
    return new Promise((resolve => {
        getAllTypeAsObj('users', (results) => {
            resolve(results === null);
        });
    }));
}

/** this function helps initing the db by setting products
 *
 * @param object - the product
 * @return {boolean}
 */
function addProductInit(object) {
    if (!firstInitAssign()) {
        return false;
    }
    let id = generateNewIDforObject("product");
    let path1 = `${imagesPath}/${object.image}`;
    if (!path1) {
        try {
            throw new ErrorHandler(401, "Not the same email");
        } catch (err) {
            console.log(err);
        }
        return;
    }
    if (Number(object.price) !== object.price && Number(object.price) <= 0) {
        //error
        try {
            throw new ErrorHandler(401, "Not the same email");
        } catch (err) {
            console.log(err);
        }
        return;
    }
    let product = {
        id: id,
        name: object.name,
        description: object.description,
        category: object.category,
        image: path1,//jpeg,png file path to cloud ??
        color: object.color,// 6 digit hex
        price: object.price,
        rating: 0,
        usersVoted: [],
        sumratings: 0,
        numvote: 0,
        users_likes: []
    };
    redisClient.hset('products', id, JSON.stringify(product), (err, results) => {
        if (err) console.log(err);
    });
}

/** This function is helping initing the database
 * and add admin and few products to db
 *
 * @return {Promise<>}
 */
async function setBaseDB() {
    if (!await firstInitAssign()) {
        return false;
    }
    let data = {
        name: "Air Mattress",
        description: "This is an air mattress. After using an air pump you can go an sleep on it",
        category: "camping_accessories",
        image: "Air Mattress.png",
        color: "Black",
        price: 50,
    };
    addProductInit(data);
    data = {
        name: "Backpack",
        description: "This is a backpack. This backpack has a bottle carrier an 2 storage unit",
        category: "storage",
        image: "Backpack.png",
        color: "Red",
        price: 30,
    };
    addProductInit(data);
    data = {
        name: "Blanket",
        description: "This is a blanket to cover your self up while sleeping cold night",
        category: "camping_accessories",
        image: "Blanket.png",
        color: "Light Blue",
        price: 25,
    };
    addProductInit(data);
    data = {
        name: "Bottles",
        description: "This is an Bottle Set. 4 bottles, and pouring related products",
        category: "culinary",
        image: "Bottles.png",
        color: "Black",
        price: 50,
    };
    addProductInit(data);
    data = {
        name: "Carpet",
        description: "A soft carpet suitable for sitting and relaxation",
        category: "camping_accessories",
        image: "Carpet.png",
        color: "Pink",
        price: 80,
    };
    data = {
        name: "Womens Coat",
        description: "Warm and lite coat, water resistance, double sided blue & orange",
        category: "clothing",
        image: "Womens Coat.png",
        color: "blue",
        price: 150,
    };
    addProductInit(data);
    data = {
        name: "Fleece Women",
        description: "Warm and soft fleece",
        category: "clothing",
        image: "Fleece Women.png",
        color: "Gray",
        price: 120,
    };
    addProductInit(data);
    data = {
        name: "Wool Hat",
        description: "Merino wool hat. Warm and very soft",
        category: "clothing",
        image: "Wool Hat.png",
        color: "white",
        price: 100,

    };
    addProductInit(data);
    data = {
        name: "Jacket",
        description: "Warm, water resistance men’s coat",
        category: "clothing",
        image: "Jacket.png",
        color: "Dark Gray",
        price: 200,

    };
    addProductInit(data);
    data = {
        name: "Head Flashlight",
        description: "24 hours battery Soft straps",
        category: "camping_accessories",
        image: "Head Flashlight.png",
        color: "Black",
        price: 80,
    };
    addProductInit(data);
    data = {
        name: "Shade Canopy",
        description: "Strong shade canopy with sun screen. Suitable for 4 people",
        category: "camping_accessories",
        image: "Shade Canopy.png",
        color: "silver",
        price: 250,
    };
    addProductInit(data);
    data = {
        name: "Picnic Cooler",
        description: "Soft picnic cooler. 32 liters",
        category: "storage",
        image: "Picnic Cooler.png",
        color: "Blue",
        price: 150,
    };
    addProductInit(data);
    data = {
        name: "Neck Warmer",
        description: "warms the neck in cold weather",
        category: "camping_accessories",
        image: "Neck Warmer.png",
        color: "blue",
        price: 80,
    };
    addProductInit(data);
    data = {
        name: "Neck Pillow",
        description: "Good support for head and neck during travel",
        category: "camping_accessories",
        image: "Neck Pillow.png",
        color: "Yellow",
        price: 80,
    };
    addProductInit(data);
    data = {
        name: "Lock Passcode",
        description: "Lock with passcode",
        category: "camping_accessories",
        image: "Lock Passcode.png",
        color: "blue",
        price: 60,
    };
    addProductInit(data);
    data = {
        name: "Lock Keys",
        description: "Lock with keys",
        category: "camping_accessories",
        image: "Lock keys.png",
        color: "Orange",
        price: 60,
    };
    addProductInit(data);
    data = {
        name: "Name Tag",
        description: "Name tags. Suitable for bags and suitcases",
        category: "camping_accessories",
        image: "Name Tag.png",
        color: "Green",
        price: 25,
    };
    addProductInit(data);
    data = {
        name: "תיק גב",
        description: " Easy to fold bag. Allows extra storage when needed",
        category: "camping_accessories",
        image: "Folding Bag.png",
        color: "Black",
        price: 100,
    };
    addProductInit(data);
    data = {
        name: "Folding Chair",
        description: "Easy to fold chair. Vert light weight",
        category: "camping_accessories",
        image: "Folding Chair.png",
        color: "Black",
        price: 150,
    };
    addProductInit(data);
    let adminId = "user_admin";
    let admin = {
        id: adminId,
        email: "Admin@flint.com",
        name: "Admin",
        password: "Admin",
        logins: [], // contains date,hours in UTC, Local time
        purchases: [], //contains , purchase object that includes, items , prices, colors?, date, and after purchase clear cart
        cart: [],         // should be in cookies?
        sessions: [],   // list of all sessions
        permission_level: 1,//Admin
        incorrect_tries: 0,
        locked_expires: new Date().toUTCString(),
        lock_time_multiplier: 0,
        products_liked: []
    };
    redisClient.hset("users", adminId, JSON.stringify(admin), (err, results) => {
        if (err) console.log(err);
    });

}

// activating the set DB
setBaseDB();

// error handler
app.use((err, req, res, next) => {
    handleError(err, res);
});

// Server listening
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});


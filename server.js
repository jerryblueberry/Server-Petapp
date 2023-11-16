const express = require("express");
const axios = require("axios");
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//  for the db connection
// later change the file structure
const mongoose = require('mongoose');
const CONNECTION = 'mongodb+srv://sajan2121089:sajank1818@cluster0.nvih7mc.mongodb.net/?retryWrites=true&w=majority'


const app = express();
const port  = 8000;
app.use(cors());
//  import the path
const path = require("path")

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(passport.initialize());


const connectDb = async() => {
    try {
        const connect = await mongoose.connect(CONNECTION);
        console.log('Database connected')
    } catch (error) {
        console.log("error");
    }
}




app.listen(port,() => {
  console.log(`Server Running on Port ${port}`);
})
connectDb();
//  directory for file path
app.use("/files", express.static(path.join(__dirname, "files")));

//  for the multer 
const multer = require("multer");

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "files/"); // Specify the desired destination folder
  },
  filename: function (req, file, cb) {
    // Generate a unique filename for the uploaded file
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

//  model import 
const User  = require('./models/user');
const Product = require('./models/product');
const Review = require('./models/review');
const Message = require('./models/message');

//  end point to register user
app.post('/register', (req, res) => {
  const { name, email, password, image } = req.body;
  //  create a new User Object
  const newUser = new User({ name, email, password, image });

  //  save the user to the database
  newUser
    .save()
    .then(() => {
      res.status(200).json({ message: 'User Registered Successfully' });
    })
    .catch((err) => {
      res.status(500).json({ message: 'Error registering the User', err });
    });
});

//  function to create a token for the user
const createToken = (userId) => {
  //  set the token payload
  const payload = {
    userId:userId,
  };
  //  generate the token with a secret key
  const token = jwt.sign(payload,'Q$r2K6W8n!jCW%Zk',{expiresIn: '1h'});

  return token;
}
//  end point for login 
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  //  check if the email and password are provided
  if (!email || !password) {
    return res
      .status(404)
      .json({ message: 'Email and the password are required' });
  }
  //  check for that user in the database

  User.findOne({ email })
    .then((user) => {
      if (!user) {
        //  user not found
        return res.status(404).json({ message: 'User not Found' });
      }
      //  compare the provided password with the password in the database
      if (user.password !== password) {
        return res.status(404).status.json({ message: 'Invalid Password' });
      }

      const token = createToken(user._id);
      res.status(200).json({ token });
    })
    .catch((error) => {
      console.log('Error in Finding the User', error);
      res.status(500).json({ message: 'Internal Server Error' });
    });
});


// Endpoint to get recent chat users
// app.get('/recent-chats/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Find recent messages based on the userId
//     const recentMessages = await Message.find({
//       $or: [{ senderId: userId }, { recepientId: userId }],
//     })
//       .sort({ timeStamp: -1 }) // Sort by timestamp in descending order
//       .limit(10); // Limit the number of recent messages

//     const recentChatUsers = [];
//     const uniqueUserIds = new Set();

//     // Extract unique user IDs from recent messages
//     recentMessages.forEach((message) => {
//       if (message.senderId !== userId) {
//         uniqueUserIds.add(message.senderId);
//       }
//       if (message.recepientId !== userId) {
//         uniqueUserIds.add(message.recepientId);
//       }
//     });

//     // Fetch user information for each unique user ID
//     for (const uniqueUserId of uniqueUserIds) {
//       const user = await User.findById(uniqueUserId);
//       if (user) {
//         recentChatUsers.push({
//           _id: user._id,
//           name: user.name,
//           image: user.image,
//         });
//       }
//     }

//     res.json(recentChatUsers);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// Endpoint to get recent chat users
app.get('/recent-chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find recent messages based on the userId
    const recentMessages = await Message.find({
      $or: [{ senderId: userId }, { recepientId: userId }],
    })
      .sort({ timeStamp: -1 }) // Sort by timestamp in descending order
      .limit(10); // Limit the number of recent messages

    const recentChatUsers = [];
    const uniqueUserIds = new Set();

    // Extract unique user IDs from recent messages
    recentMessages.forEach((message) => {
      if (message.senderId !== userId) {
        uniqueUserIds.add(message.senderId);
      }
      if (message.recepientId !== userId) {
        uniqueUserIds.add(message.recepientId);
      }
    });

    // Fetch user information for each unique user ID
    const users = await User.find({ _id: { $in: Array.from(uniqueUserIds) } });

    res.json(users);
  } catch (error) {
    console.error('Error fetching recent chat users', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//  get the logged in user id
app.get('/loggedUser/:userId', (req, res) => {
  const loggedInUserId = req.params.userId;

  User.findOne({ _id: loggedInUserId })
    .then((user) => {
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: 'Logged-in user not found' });
      }
    })
    .catch((err) => {
      console.log('Error retrieving logged-in user', err);
      res.status(500).json({ message: 'Error retrieving logged-in user' });
    });
});
//  end point to create a new product
// Create a new product
// app.post('/add', async (req, res) => {
//   try {
//     const product = new Product(req.body);
//     const savedProduct = await product.save();
//     res.status(201).json(savedProduct);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

app.post('/add', async (req, res) => {
  try {
    const { name, description, breed, age, image, weight,postedBy,location } = req.body;
    // const userId = req.user.userId; // Assuming you have user information in req.user

    const product = new Product({
      name,
      description,
      breed,
      location,
      age,
      image,
      weight,
      timestamp:new Date(),
      postedBy,
      // Include the user who posted the product
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//  endpoint to get all products
// Get all products
// app.get('/products', async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
//  old code 
// app.get('/products', async (req, res) => {
//   try {
//     const products = await Product.find().populate('postedBy'); // Populate the 'postedBy' field
//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


//  new code with the  search functionality
// app.get('/products', async (req, res) => {
//   try {
//     const search = req.query.search || "";
    
//     // Define an array of conditions for each field you want to search
//     const searchConditions = [
//       { name: { $regex: search, $options: "i" } },
//       // { email: { $regex: search, $options: "i" } },
//       { location: { $regex: search, $options: "i" } }
//     ];

//     // Use the $or operator to search for products matching any of the conditions
//     const products = await Product.find({ $or: searchConditions }).populate('postedBy');

//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


//  for no products when searchong if no product exists
app.get('/products', async (req, res) => {
  try {
    const search = req.query.search || "";

    // Define an array of conditions for each field you want to search
    const searchConditions = [
      { name: { $regex: search, $options: "i" } },
      // { email: { $regex: search, $options: "i" } },
      // { location: { $regex: search, $options: "i" } }
    ];

    // Use the $or operator to search for products matching any of the conditions
    const products = await Product.find({ $or: searchConditions }).populate('postedBy','name image _id')
    .sort({timeStamp:-1})
    .limit(10);

    if (products.length === 0) {
      // No search results found
      return res.status(404).json({ message: "Not Found" });
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// app.get('/products', async (req, res) => {
//   try {
//     const search = req.query.search || "";

//     // Define an array of conditions for each field you want to search
//     const searchConditions = [
//       { name: { $regex: search, $options: "i" } },
//       // { email: { $regex: search, $options: "i" } },
//       { location: { $regex: search, $options: "i" } }
//     ];

//     // Use the $or operator to search for products matching any of the conditions
//     const products = await Product.find({ $or: searchConditions }).populate('postedBy');

//     if (products.length === 0) {
//       // No search results found
//       return res.status(404).json({ message: "Not Found" });
//     }

//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Endpoint to get products by location
app.get('/products/location/:location', async (req, res) => {
  try {
    const search = req.query.q || "";
    const { location } = req.params;

    // Define an array of conditions for each field you want to search
    const searchConditions = [
      { name: { $regex: search, $options: "i" } },
      // Add other conditions as needed
    ];

    // Use a case-insensitive regex to match the location
    const locationCondition = { location: { $regex: new RegExp(location, 'i') } };

    // Combine search conditions with the location condition using $and
    const products = await Product.find({
      $and: [{$or: searchConditions}, locationCondition],
    })
      .populate('postedBy', 'name image _id') // Populate the 'postedBy' field
      .sort({ timeStamp: -1 }) // Sort by timestamp in descending order
      .limit(10); // Limit the number of products

    if (products.length === 0) {
      // No products found for the given location and search query
      return res.status(404).json({ message: "No products found for the specified location and search query" });
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//  to get the product by id
app.get('/products/:productId',async(req,res) => {
  
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId).populate('postedBy');
    if(!product){
      return res.status(404).json({error:"Product Not found"})
    } 
    res.json(product);
  } catch (error) {
    res.status(500).json({error:error.message});
  }
})




//  fetch posts created by a specific user
app.get('/users/:userId/posts', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all the posts created by the user and sort them by timestamp in descending order
    const userPosts = await Product.find({ postedBy: userId }).populate('postedBy')
      .sort({ timeStamp: -1 })
      .limit(10);

    res.json(userPosts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Create a new review
// Handle review submission on the server
app.post('/reviews', async (req, res) => {
  try {
    // Validate and extract data from the request body
    const { userId, productId, comment, rating } = req.body;

    // Create a new review document
    const newReview = new Review({
      userId,
      productId,
      comment,
      rating,
      createdAt: new Date(),
    });

    // Save the review to the database
    const savedReview = await newReview.save();

    // Respond with a success message or the saved review
    res.status(201).json(savedReview);
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(400).json({ error: error.message });
  }
});


// Get all reviews for a specific product
app.get('/reviews/products/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const reviews = await Review.find({ productId }).populate('userId');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//  end point to post message and store them in backend
app.post('/messages',upload.single('imageFile'),async(req,res) => {
  try {
    const {senderId,recepientId,messageType,messageText} = req.body;

    const newMessage = new Message({
      senderId,
      recepientId,
      messageType,
      message:messageText,
      timeStamp:new Date(),
      imageUrl  : messageType === "image" ? req.file.path : null,
    });
    await newMessage.save();
    
    res.status(200).json({message:"Message Sent Successfully"});

  } catch (error) {
    console.log(error);
    res.status(500).json({error:"Internal Server Error"});
  }
})

//  endpoint to get the user Details to design the chat room header
app.get('/user/:userId',async (req,res) => {
  try {
    const {userId} =req.params;

    //  fetch the user data from the user Id
    const recepientId = await User.findById(userId);
    res.json(recepientId);

    
  } catch (error) {
    console.log(error);
    res.status(500).json({error:'Internal'})
    
  }
})

//  endpoint to fetch the messages between two users in the chatroom

app.get('/messages/:senderId/:recepientId', async (req, res) => {
  try {
    const { senderId, recepientId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: senderId, recepientId: recepientId },
        { senderId: recepientId, recepientId: senderId },
      ],
    }).populate('senderId', '_id');
    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
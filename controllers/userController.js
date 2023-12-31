const catchAsyncError = require("../middleware/catchAsyncError");
const User = require("../model/userModal");
const { sendToken, cookieOptions } = require("../utils/feature.js");
const ErrorHander = require("../utils/errorhandler");
const ApiFeatures = require("../utils/apiFeatures.js");




exports.createUser = catchAsyncError(async (req, res, next) => {


    const { name, phone, email, password } = req.body

    const response = await User.findOne({
        $or: [
            { username: name },   // Replace yourInput with the actual username you are searching for
            { phone: phone },
            { email: email }    // Replace yourInput with the actual phone number you are searching for
        ],
    })


    if (response) return next(new ErrorHander("User already exist  ", 400));

    const user = await User.create({ name, phone, email, password })
    sendToken(user, res, 201, "Registered Successfully");
})


exports.loginUser = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await User.findOne({
        $or: [
            { name: email },   // Replace yourInput with the actual username you are searching for
            { email: email },
            { phone: email },      // Replace yourInput with the actual phone number you are searching for
        ],
    }).select("+password");

    if (!user) return next(new ErrorHander("user not found", 404));

    if (!password) return next(ErrorHander("please enter password", 400))

    const isMatch = await user.comparePassword(password)

    if (!isMatch) return next(new ErrorHander("please enter correct password", 400))
    sendToken(user, res, 200, `Welcome Back, ${user.name}`);
})

exports.logoutUser = catchAsyncError(async (req, res, next) => {
    res.status(200).cookie('crystal', "", { ...cookieOptions, expires: new Date(Date.now()) }).json({
        success: true,
        message: 'logout successful'
    })
})

exports.getMyProfile = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    res.status(200).json({
        success: true,
        user,
    });
});

exports.updateProfile = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    const { name, phone, email } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email) user.email = email;



    await user.save();

    res.status(200).json({
        success: true,
        message: "Profile Updated Successfully",
    });

})

exports.getAllUser = catchAsyncError(async (req, res, next) => {
    const pagination = 10
    const userCount = await User.countDocuments()

    const apiFeatures = new ApiFeatures(User.find(), req.query).searchByName().searchByPhone().searchByStd().pagination(pagination)
    const users = await apiFeatures.query;
    res.status(200).json({
        success: true,
        userCount,
        users
    })

});



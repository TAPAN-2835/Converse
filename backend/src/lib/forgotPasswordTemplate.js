const forgotPasswordTemplate = ({ name, otp }) => {
    return `
<div>
    <p>Dear ${name},</p>
    <p>You requested a password reset for your Streamify account. Please use the following OTP code to reset your password:</p>
    <div style="background:yellow; font-size:20px; padding:20px; text-align:center; font-weight:800;">
        ${otp}
    </div>
    <p>This OTP is valid for 1 hour only. Enter this OTP in the Streamify website to proceed with resetting your password.</p>
    <br/>
    <p>Thanks,</p>
    <p>Streamify Team</p>
</div>
    `;
};

export default forgotPasswordTemplate; 
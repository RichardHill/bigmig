# bigmig
Robotic Trading App using AWS and IG Markets API

This is very early on and I am not going to write a massively detailed set of instructions - just yet - but I will and it will be fun! 

What do I need -:

1. An account with IG.
2. An AWS account.
3. Node Installed.
4. Serverless installed.
5. A command prompt.

To provision your AWS account you will need to follow these steps -: https://docs.aws.amazon.com/polly/latest/dg/setup-aws-cli.html

1. You will need to update the cloud formation script with your IG Username, Password and API Key.
2. I have had to make some 'tweaks' to the brilliant node package 'node-ig-api' (https://www.npmjs.com/package/node-ig-api) written by Giuseppe Fiocco. Follow these instructions -:
    
- npm install
- Find node-ig-api folder.
- Open index.js - replace its contents with the contents of .api-re-write.js
- Open cloudformation.yml and update the values in lines 31-33 with you IG Trading Credentials.

3. Deploy the stack -: aws cloudformation deploy --template-file cloudformation.yml --stack-name bigmig --capabilities CAPABILITY_IAM
4. Create the Serverless deployment -: sls package
5. Deploy the Lambda ( go into the .serverless folder) -: 

   - aws lambda update -function-code --function-name BigMig --zip-file fileb://bigmig.zip

To destroy the BOT from your account -: 

    - aws cloudformation delete-stack --stack-name bigmig

You should now be trading! 

Things to remember -:

* I TAKE NO RESPONSIBILITY FOR WHAT YOU DO WITH THIS SOFTWARE. YOU USE THIS SOFTWARE AT YOUR OWN PERIL!!!
* This 'bot' trades every minute , Monday to Friday 8.30 - 5pm. If you want to change the frequency then tweak the cron setting in serverles.yml
* It will only close positions if you are in profit. There are stops in place and you will need to adjust the markets array to suite your requirements.
* It is configured to trade in 4 markets - you can change this however you want by changing the array located at the top of the file (index.js - markets)
* There is a two step process when the lambda is invoked - it checks to see if it should close any open positions then it checks the markets that do not have any positions and tries to place one. It is the latter part in which you can try out any trading ideas. 

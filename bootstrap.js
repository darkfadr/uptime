import mongoose from 'mongoose';
import config from 'config';
import semver from 'semver';

const {connectionString, user, password, server, database} = config.mongodb;

// configure mongodb
mongoose.connect(connectionString || `mongodb://${user}:${password}@${server}/${database}`);

mongoose.connection.on('open', err => {
  mongoose.connection.db.admin()
    .serverStatus((err, data) => {
      console.log('coneection works to a certain degree');
      if (err) {
        if (err.name === "MongoError" && (err.errmsg === 'need to login' || err.errmsg === 'unauthorized') && !connectionString) {
          console.log('Forcing MongoDB authentication');
          mongoose.connection.db
            .authenticate(user, password, err => {
              if (!err) return;
              console.error(err); process.exit(1);
            });
          return;
        } else {
          console.error(err); process.exit(1);
        }
      }
      if (!semver.satisfies(data.version, '>=2.1.0')) {
        console.error(`Error: Uptime requires MongoDB v2.1 minimum. The current MongoDB server uses only ${data.version}`);
        process.exit(1);
      }
    });
});

mongoose.connection.on('error', err => {
  console.error(`MongoDB error: ${err.message}`);
  console.error('Make sure a mongoDB server is running and accessible by this application');
  process.exit(1);
});


export default mongoose;

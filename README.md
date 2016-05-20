## About

Classroom Collaborative Application Framework (CCAF) is a platform for managing multiple multitouch devices in a classroom.

## Components

CCAF is a suite of applications that work together to provide a cohesive classroom solution.

### [ccaf-server](http://github.com/ccaf/ccaf-server)

The server creates a shared state for all devices in the classroom and allows them to communicate with each other. It serves all the web components of the platform and apps for the platform. It uses [checkerboard](http://github.com/gregoryfabry/checkerboard/) to synchronize devices seamlessly. It also retains device state and configuration between restarts, and provides a server discovery service to prevent users from having to enter IP addresses.

The server keeps an embedded database to store app state and configuration details. The database is outlined in [schema.json](https://github.com/ccaf/ccaf-server/blob/master/schema.json).

### [ccaf-web](http://github.com/ccaf/ccaf-web)

All components of the platform can be accessed from a web browser.

#### Client

The client application for use by a student allows them to access apps on the platform. A student logs in and can access shared representations of apps as specified by the teacher.

**Example use**

The student logs in on a tablet and and is connected to a sketch application along with three classmates. They are able to collaboratively sketch to solve physics problems together.

There is also the [native client](http://google.com/ccaf-nativeclient), which figures out where the server is located on the same network and launches the client automatically.

#### Console

The console application allows the teacher to control how students are connected to each other. They can create lessons ahead of time, assign students and groups to applications and synchronize devices, and project devices to a screen.

**Example use**

The teacher assigns each student in their class to a different group ahead of class. When students come in to class, they are automatically assigned to that group and their devices are synchronized.

#### Projector

Shows the contents of different instances of apps to the screen.

**Example use**

After groups work on physics problems together, the teacher projects the contents of two groups' screens side by side. The teacher reviews the two different ways the group solved the problem.

#### Settings

Lets server configuration and student rosters to be updated.

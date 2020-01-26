import React, { Component } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled from "styled-components";

import BoardHeader from '../cmps/boardHeader/BoardHeader.jsx';
import TopicList from '../cmps/topic/TopicList.jsx';
import ImageService from '../services/ImageService.js';
import TaskDetails from './TaskDetails.jsx';
import UtilsService from '../services/UtilsService.js';
import BoardService from '../services/BoardService.js'
import SocketService from '../services/SocketService.js'
import UserService from '../services/UserService.js'


import {
    addMemberToBoard,
    setBgCover,
    addTask,
    deleteTopic,
    addTopic,
    updateTopic,
    sortTasks,
    updateBoard,
    updateActivity,
    setCurrBoard
} from '../actions/BoardActions';
import { Route, Router } from 'react-router';
import history from '../history';

const ListContainer = styled.div`
display:flex;
flex-direction:row;
`;

class TopicPage extends Component {

    state = {
        imgs: [],
        colors: [],
        style: {},
        membersToInvite: []
    }

    componentDidMount = async () => {
        const board = await BoardService.getBoard(this.props.match.params.id)
        await this.props.setCurrBoard(board)
        this.getGalleryImgs();
        this.getGalleryColors();
        SocketService.setup();
        SocketService.emit('chat topic', this.props.match.params.id);
        SocketService.emit('user joined the board', { text: `${this.props.user.username} has joined the board` });
        SocketService.on('user changes', async (msg) => {
            console.log('topic page', msg)
            this.onAddActivity(msg);
            const board = await BoardService.getBoard(this.props.match.params.id)
            await this.props.setCurrBoard(board)
              if (msg.includes('cover')) this.initialBgImg()
              else if(msg.includes('color') && !msg.includes('task')) this.initialColorBg()
        });
    }
    async  componentDidUpdate(prevProps) {
        if (prevProps.match.params.id
            !== this.props.match.params.id) {
            const board = await BoardService.getBoard(this.props.match.params.id)
            this.props.setCurrBoard(board)
        }
        if (this.props.board && Object.entries(this.state.style).length === 0) {
            if (this.props.board.cover.includes('bg'))this.initialBgImg()
             else if(this.props.board.cover.includes('linear-gradient')) this.initialColorBg()
        }
    }

    componentWillUnmount = () => {
        SocketService.terminate();
        // SocketService.off('user joined the board');
    }


    getGalleryColors = async () => {
        const colors = await ImageService.getGalleryColors();
        await this.setState({ colors });

    }

    getGalleryImgs = async () => {
        const imgs = await ImageService.getGalleryImages();
        await this.setState({ imgs });
    }
    initialBgImg=()=>{
      const  style = {
            backgroundImage: `url(${require(`../assets/images/${this.props.board.cover}`)})`,
            position: 'fixed',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat'
        }
        this.setState({ style })
    }

    initialColorBg=()=>{
       const style = {
            background: this.props.board.cover
        }
        this.setState({ style })
    }

    changeBgImg = async (imgName) => {
        const style = {
            backgroundImage: `url(${require(`../assets/images/${imgName}`)})`,
            position: 'fixed',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat'
        }
        await this.props.setBgCover(imgName);
        this.setState({ style })
      await  BoardService.updateBoard(this.props.board)
        SocketService.emit('user changes', this.props.user.username + ' has changed board cover');
    }

    changeBgColor = async (colorName) => {
        const style = {
            background: colorName,
        }
        await this.props.setBgCover(colorName);
        this.setState({ style });
      await  BoardService.updateBoard(this.props.board)
        SocketService.emit('user changes', this.props.user.username + ' has changed board color');
    }



    deleteTopic = async (topicId) => {
        await this.props.deleteTopic(topicId);
      await  BoardService.updateBoard(this.props.board)
        SocketService.emit('user changes', this.props.user.username + ' has deleted a topic');
    }

    onAddActivity = (activityName) => {
        let date = new Date;
        date = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
        let addedActivity = { activityName: activityName, createdAt: date };
        if (this.props.board) this.props.updateActivity(addedActivity, { ...this.props.board });
    }

    changeTopicTitle = async (topic, newTxt) => {
        topic.title = newTxt;
        await this.props.updateTopic(topic);
      await  BoardService.updateBoard(this.props.board)
        SocketService.emit('user changes', this.props.user.username + ' has changed topic title');

    }

    onAddNewTopic = async(topicName) => {
        const { board } = this.props;
      await  this.props.addTopic(topicName, board._id);
        SocketService.emit('user changes', this.props.user.username + ' has added new topic');
    }

    addTask = async(taskTitle, topicId) => {
        const { board } = this.props;
      await  this.props.addTask(taskTitle, topicId, board._id);
        SocketService.emit('user changes', this.props.user.username + ' has added a new task');

    }

    onGetInitials = (fullName) => {
        return UtilsService.getInitials(fullName);
    }
    onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result
        if (!destination) {
            return
        }
        await this.props.sortTasks(
            source.droppableId,
            destination.droppableId,
            source.index,
            destination.index,
            draggableId,
            type)
      await BoardService.updateBoard(this.props.board)
        SocketService.emit('user changes', this.props.user.username + ' has drag something');
    }
    onSearchUsers = async (input) => {
        if (!input) {
            this.setState({ membersToInvite: [] })
        } else {
            const members = await UserService.searchUsersToInvite(input, this.props.board.members)
            this.setState({ membersToInvite: members })
        }
    }
    onAddMember = async (member) => {
        await this.props.addMemberToBoard(member)
        BoardService.updateBoard(this.props.board)
    }

    render() {
        const { board } = this.props
        if (!board) return 'Loading...'
        return (
            <DragDropContext onDragEnd={this.onDragEnd}>
                <div style={this.state.style} className="trello-page-container header-padding">
                    <BoardHeader
                        onAddMember={this.onAddMember}
                        membersToInvite={this.state.membersToInvite}
                        onSearchUsers={this.onSearchUsers}
                        imgs={this.state.imgs}
                        board={board}
                        changeBgImg={this.changeBgImg}
                        colors={this.state.colors}
                        changeBgColor={this.changeBgColor} />

                    <Droppable droppableId="all-lists" direction="horizontal" type="list">
                        {provided => (
                            <ListContainer {...provided.droppableProps} ref={provided.innerRef}>
                                <TopicList
                                    getInitials={this.onGetInitials}
                                    onAddNewTopic={this.onAddNewTopic}
                                    changeTopicTitle={this.changeTopicTitle}
                                    addTask={this.addTask}
                                    deleteTopic={this.deleteTopic}
                                    board={board} />
                            </ListContainer>
                        )}
                    </Droppable>
                    {/* <Router history={history}> */}
                        <Route component={TaskDetails} path="/topic/:boardId/:topicId/:taskId" exact></Route>
                    {/* </Router> */}
                </div>
            </DragDropContext>
        )
    }
}

const mapStateToProps = state => {
    return {
        board: state.board.board,
        user: state.user.loggedInUser
    };
};
const mapDispatchToProps = {
    setBgCover,
    addTask,
    deleteTopic,
    addTopic,
    updateTopic,
    sortTasks,
    updateBoard,
    updateActivity,
    setCurrBoard,
    addMemberToBoard
};

export default connect(mapStateToProps, mapDispatchToProps)(TopicPage);

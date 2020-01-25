import React, { Component } from 'react'
import UserPreview from './UserPreview.jsx'
export default class UserList extends Component {

    render() {
        return (
            <ul>
                {this.props.membersToInvite.map(member => {
                    return <li key={member._id}>
                        <UserPreview
                            onAddMember={this.props.onAddMember}
                            member={member}
                        />
                    </li>
                })}
            </ul>
        )
    }
}
